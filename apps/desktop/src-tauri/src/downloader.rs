use std::collections::HashMap;
use std::process::ExitStatus;
use std::sync::Mutex;
use std::time::Duration;

use once_cell::sync::Lazy;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::binaries;

/// A running child process, shared between the classic downloader and the
/// music import pipeline.
pub struct ActiveChild {
    pub child: tokio::process::Child,
    pub id: String,
}

/// In-memory active jobs: { id: child process } (port of the Electron app's
/// activeDownloads Map — intentionally not persisted).
static ACTIVE: Lazy<Mutex<HashMap<String, ActiveChild>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub percent: f64,
    pub speed: String,
    pub eta: String,
    pub status: String,
    pub detail: String,
    pub stage: Option<String>,
}

impl DownloadProgress {
    pub fn new(status: &str) -> Self {
        DownloadProgress {
            percent: 0.0,
            speed: "0KiB/s".into(),
            eta: "00:00".into(),
            status: status.into(),
            detail: String::new(),
            stage: None,
        }
    }
}

/// Precompiled regexes — port of the Electron backend's parseProgress.
struct ProgressRegex {
    percent: regex::Regex,
    speed: regex::Regex,
    eta: regex::Regex,
    size: regex::Regex,
    playlist: regex::Regex,
}

static RE: Lazy<ProgressRegex> = Lazy::new(|| ProgressRegex {
    percent: regex::Regex::new(r"(\d+\.\d+)%").unwrap(),
    speed: regex::Regex::new(r"at\s+([~\d.]+\w+/s)").unwrap(),
    eta: regex::Regex::new(r"ETA\s+([\d:]+)").unwrap(),
    size: regex::Regex::new(r"of\s+([~\d.]+\w+)").unwrap(),
    playlist: regex::Regex::new(r"Downloading (?:video|item) (\d+) of (\d+)").unwrap(),
});

pub fn parse_progress(line: &str, current: &mut DownloadProgress) {
    if let Some(c) = RE.percent.captures(line) {
        if let Some(m) = c.get(1) {
            if let Ok(p) = m.as_str().parse::<f64>() {
                current.percent = p;
                current.status = "downloading".into();
            }
        }
    }
    if let Some(c) = RE.speed.captures(line) {
        if let Some(m) = c.get(1) {
            current.speed = m.as_str().to_string();
        }
    }
    if let Some(c) = RE.eta.captures(line) {
        if let Some(m) = c.get(1) {
            current.eta = m.as_str().to_string();
        }
    }
    if let Some(c) = RE.playlist.captures(line) {
        if let Some(m) = c.get(0) {
            current.detail = m.as_str().to_string();
        }
    } else if let Some(c) = RE.size.captures(line) {
        if let Some(m) = c.get(1) {
            current.detail = m.as_str().to_string();
        }
    }
}

pub async fn broadcast_progress(app: &AppHandle, id: &str, progress: &DownloadProgress) {
    let _ = app.emit("download-progress", (id.to_string(), progress.clone()));
}

fn resolve_downloads_dir() -> std::path::PathBuf {
    dirs::download_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Flowbyte Downloads")
}

fn sanitize(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    for c in name.chars() {
        if matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') || (c as u32) < 0x20 {
            out.push('_');
        } else {
            out.push(c);
        }
    }
    out
}

async fn get_playlist_name(app: &AppHandle, url: &str) -> String {
    let fallback = format!(
        "Playlist_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let ytdlp = match binaries::resolve_binary(app, "yt-dlp") {
        Ok(p) => p,
        Err(_) => return fallback,
    };
    let out = tokio::process::Command::new(&ytdlp)
        .args(["--print", "%(playlist_title)s", "--playlist-items", "1"])
        .arg(url)
        .output()
        .await;
    match out {
        Ok(o) if o.status.success() => {
            let title = String::from_utf8_lossy(&o.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if title.is_empty() {
                fallback
            } else {
                sanitize(&title)
            }
        }
        _ => fallback,
    }
}

/// Classic download modes — port of the Electron backend's 7 types.
/// Progress is streamed to the frontend as "download-progress" events.
#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    url: String,
    download_type: String,
) -> Result<String, String> {
    let id = uuid_v4();
    let ytdlp = binaries::resolve_binary(&app, "yt-dlp")?;
    let ffmpeg = binaries::resolve_binary(&app, "ffmpeg")?;
    let downloads_dir = resolve_downloads_dir();
    std::fs::create_dir_all(&downloads_dir).map_err(|e| format!("create downloads dir: {e}"))?;

    let ffmpeg_str = ffmpeg.to_string_lossy().to_string();
    let mut progress = DownloadProgress::new("preparing");

    let args: Vec<String> = match download_type.as_str() {
        "playlist" => {
            progress.detail = "Fetching playlist info...".into();
            broadcast_progress(&app, &id, &progress).await;
            let folder = downloads_dir.join(get_playlist_name(&app, &url).await);
            std::fs::create_dir_all(&folder).map_err(|e| format!("create playlist folder: {e}"))?;
            let template = folder.join("%(playlist_index)s - %(title)s.%(ext)s");
            let template_str = template.to_string_lossy().to_string();
            vec![
                "-f".to_string(),
                "bestaudio/best".into(),
                "-o".into(),
                template_str,
                "--no-part".into(),
                "--no-cache-dir".into(),
                "--no-warnings".into(),
                "-x".into(),
                "--audio-format".into(),
                "mp3".into(),
                "--extractor-retries".into(),
                "3".into(),
                "--ignore-errors".into(),
                "--yes-playlist".into(),
                "--ffmpeg-location".into(),
                ffmpeg_str,
                url,
            ]
        }
        _ => vec![
            "-f".into(),
            "bestaudio".into(),
            "-x".into(),
            "--audio-format".into(),
            "mp3".into(),
            "-o".into(),
            downloads_dir.join("%(title)s.%(ext)s").to_string_lossy().to_string(),
            "--ffmpeg-location".into(),
            ffmpeg_str,
            url,
        ],
    };

    broadcast_progress(&app, &id, &progress).await;

    let mut child = tokio::process::Command::new(&ytdlp)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn yt-dlp: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    ACTIVE.lock().unwrap().insert(id.clone(), ActiveChild { child, id: id.clone() });

    // Progress pump
    let app2 = app.clone();
    let id2 = id.clone();
    tauri::async_runtime::spawn(async move {
        use tokio::io::AsyncBufReadExt;
        let mut reader = tokio::io::BufReader::new(stdout);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    let mut p = DownloadProgress::new("downloading");
                    parse_progress(&line, &mut p);
                    if p.percent > 0.0 || !p.detail.is_empty() {
                        broadcast_progress(&app2, &id2, &p).await;
                    }
                }
            }
        }
    });

    // Finalizer: poll the child until it exits or is removed (cancelled).
    let app3 = app.clone();
    let id3 = id.clone();
    tauri::async_runtime::spawn(async move {
        let status: Option<ExitStatus> = loop {
            let removed = {
                let mut guard = ACTIVE.lock().unwrap();
                let gone = !guard.contains_key(&id3);
                let s = guard.get_mut(&id3).map(|c| c.child.try_wait());
                if gone {
                    Some(None)
                } else {
                    match s {
                        Some(Ok(Some(st))) => Some(Some(st)),
                        Some(Ok(None)) => None,
                        Some(Err(_)) | None => Some(None),
                    }
                }
            };
            match removed {
                Some(None) => break None, // cancelled or removed
                Some(Some(st)) => break Some(st),
                None => tokio::time::sleep(Duration::from_millis(250)).await,
            }
        };
        ACTIVE.lock().unwrap().remove(&id3);
        let mut final_p = DownloadProgress::new(match status {
            Some(st) if st.success() => "completed",
            Some(_) => "failed",
            None => "cancelled",
        });
        if final_p.status == "completed" {
            final_p.percent = 100.0;
        }
        broadcast_progress(&app3, &id3, &final_p).await;
    });

    Ok(id)
}

/// Cancel an active download.
#[tauri::command]
pub async fn cancel_download(id: String) -> Result<(), String> {
    let child = ACTIVE.lock().unwrap().remove(&id);
    if let Some(mut c) = child {
        let _ = c.child.kill().await;
        Ok(())
    } else {
        Err("Download not found".into())
    }
}

fn uuid_v4() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("dl-{now}-{n}")
}