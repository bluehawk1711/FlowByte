use std::path::{Path, PathBuf};
use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::binaries;
use crate::downloader::{broadcast_progress, ActiveChild};

static ACTIVE: Lazy<Mutex<std::collections::HashMap<String, ActiveChild>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MusicImportOptions {
    pub bitrate: Option<u32>,
    pub transcode: Option<bool>,
}

/// Result payload emitted as "music-import-done" when the local pipeline
/// (download → optimize) finishes; the React side then uploads to the API.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MusicImportResult {
    pub id: String,
    pub title: String,
    pub artist: Option<String>,
    pub duration: f64,
    pub video_id: String,
    pub source_url: String,
    pub year: Option<i32>,
    pub audio_path: String,
    pub audio_codec: String,
    pub audio_bitrate: Option<i64>,
    pub thumbnail_path: Option<String>,
    pub subtitle_paths: Vec<String>,
}

fn codec_from_ext(ext: &str) -> String {
    match ext.to_ascii_lowercase().as_str() {
        "opus" | "ogg" => "opus",
        "m4a" | "mp4" => "aac",
        "webm" => "opus",
        "mp3" => "mp3",
        "wav" => "pcm",
        other => other.to_string(),
    }
}

/// Full music import pipeline (desktop-side):
/// yt-dlp bestaudio (+thumbnail + auto subs) → optional FFmpeg transcode
/// to Opus → emit "music-import-done" with local file paths.
#[tauri::command]
pub async fn start_music_import(
    app: AppHandle,
    url: String,
    opts: Option<MusicImportOptions>,
) -> Result<String, String> {
    let id = uuid_v4();
    let ytdlp = binaries::resolve_binary(&app, "yt-dlp")?;
    let ffmpeg = binaries::resolve_binary(&app, "ffmpeg")?;
    let import_dir = binaries::import_dir(&app)?;

    let bitrate = opts.as_ref().and_then(|o| o.bitrate).unwrap_or(160).clamp(64, 320);
    let transcode = opts.as_ref().and_then(|o| o.transcode).unwrap_or(false);

    let mut progress = crate::downloader::DownloadProgress::new("preparing");
    progress.stage = Some("download".into());
    broadcast_progress(&app, &id, &progress).await;

    // 1) metadata
    progress.detail = "Fetching video info...".into();
    broadcast_progress(&app, &id, &progress).await;
    let meta = crate::info::fetch_metadata(&ytdlp, &url).await.map_err(|e| format!("video info failed: {e}"))?;

    let title = meta.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled").to_string();
    let video_id = meta.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let artist = meta.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string());
    let duration = meta.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let year: Option<i32> = meta.get("upload_date").and_then(|v| v.as_str())
        .and_then(|d| d.get(..4)).and_then(|y| y.parse().ok());
    let abr: Option<i64> = meta.get("abr").and_then(|v| v.as_i64());
    let source_url = meta.get("webpage_url").and_then(|v| v.as_str()).unwrap_or(&url).to_string();

    if duration <= 0.0 {
        return Err("Could not determine video duration (private / live stream?)".into());
    }

    // 2) download + optional transcode + thumbnail + auto subs
    let template = import_dir.join(format!("{video_id}.%(ext)s"));
    let mut args = vec![
        "-f".to_string(),
        "bestaudio/best".into(),
        "-x".into(),
        "-o".into(),
        template.to_string_lossy().to_string(),
        "--write-thumbnail".into(),
        "--convert-thumbnails".into(),
        "jpg".into(),
        "--write-auto-subs".into(),
        "--sub-langs".into(),
        "en.*".into(),
        "--convert-subs".into(),
        "vtt".into(),
        "--no-part".into(),
        "--no-cache-dir".into(),
        "--no-warnings".into(),
        "--no-playlist".into(),
        "--ffmpeg-location".into(),
        ffmpeg.to_string_lossy().to_string(),
    ];
    if transcode {
        args.extend([
            "--audio-format".into(),
            "opus".into(),
            "--audio-quality".into(),
            format!("{bitrate}K"),
        ]);
    }
    args.push(url.clone());

    let mut child = tokio::process::Command::new(&ytdlp)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn yt-dlp: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    ACTIVE.lock().unwrap().insert(id.clone(), ActiveChild { child, id: id.clone() });

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
                    let mut p = crate::downloader::DownloadProgress::new("downloading");
                    crate::downloader::parse_progress(&line, &mut p);
                    p.stage = Some("download".into());
                    if p.percent > 0.0 || !p.detail.is_empty() {
                        broadcast_progress(&app2, &id2, &p).await;
                    }
                }
            }
        }
    });

    // Wait for the child, then gather output files and emit done/failed.
    let app3 = app.clone();
    let id3 = id.clone();
    let import_dir3 = import_dir.clone();
    let title3 = title.clone();
    let artist3 = artist.clone();
    let duration3 = duration;
    let video_id3 = video_id.clone();
    let source_url3 = source_url.clone();
    let year3 = year;
    let abr3 = abr;
    let transcode3 = transcode;
    let bitrate3 = bitrate;

    tauri::async_runtime::spawn(async move {
        // Take the child out of ACTIVE and await its exit (kill on cancel
        // resolves this immediately).
        let status = {
            let mut guard = ACTIVE.lock().unwrap();
            guard.remove(&id3).map(|a| a.child)
        };
        let exit_ok = match status {
            Some(mut child) => child.wait().await.is_ok() && child.try_wait().ok().flatten().map(|s| s.success()).unwrap_or(true),
            None => false, // cancelled
        };
        ACTIVE.lock().unwrap().remove(&id3);

        let mut done = crate::downloader::DownloadProgress::new("processing");
        done.stage = Some("processing".into());
        done.detail = "Optimizing audio...".into();
        broadcast_progress(&app3, &id3, &done).await;

        if exit_ok {
            let files = collect_outputs(&import_dir3, &video_id3);
            if files.audio.is_empty() {
                let mut fail = crate::downloader::DownloadProgress::new("failed");
                fail.stage = Some("download".into());
                fail.detail = "yt-dlp finished without producing audio".into();
                broadcast_progress(&app3, &id3, &fail).await;
                return;
            }
            let audio_ext = files.audio[0].extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
            let result = MusicImportResult {
                id: id3.clone(),
                title: title3.clone(),
                artist: artist3.clone(),
                duration: duration3,
                video_id: video_id3.clone(),
                source_url: source_url3.clone(),
                year: year3,
                audio_path: files.audio[0].to_string_lossy().to_string(),
                audio_codec: codec_from_ext(&audio_ext),
                audio_bitrate: if transcode3 { Some(bitrate3 as i64) } else { abr3 },
                thumbnail_path: files.thumbnail.map(|p| p.to_string_lossy().to_string()),
                subtitle_paths: files.subtitles.iter().map(|p| p.to_string_lossy().to_string()).collect(),
            };
            let _ = app3.emit("music-import-done", (id3.clone(), result));
        } else {
            let mut cancelled = crate::downloader::DownloadProgress::new("cancelled");
            cancelled.stage = Some("download".into());
            broadcast_progress(&app3, &id3, &cancelled).await;
        }
    });

    Ok(id)
}

/// Cancel a music import in progress.
#[tauri::command]
pub async fn cancel_music_import(id: String) -> Result<(), String> {
    let entry = ACTIVE.lock().unwrap().remove(&id);
    if let Some(mut a) = entry {
        let _ = a.child.kill().await;
        Ok(())
    } else {
        Err("Import not found".into())
    }
}

/// Read a local file as bytes (used to upload staged audio/artwork to the API).
#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    tokio::fs::read(&path)
        .await
        .map_err(|e| format!("read {path}: {e}"))
}

/// Delete staged files after a successful upload (no orphans on disk).
#[tauri::command]
pub async fn delete_files(paths: Vec<String>) -> Result<(), String> {
    for p in paths {
        let _ = tokio::fs::remove_file(&p).await;
        let _ = tokio::fs::remove_file(format!("{p}.jpg")).await;
    }
    Ok(())
}

struct Outputs {
    audio: Vec<PathBuf>,
    thumbnail: Option<PathBuf>,
    subtitles: Vec<PathBuf>,
}

fn collect_outputs(dir: &Path, video_id: &str) -> Outputs {
    let mut out = Outputs { audio: vec![], thumbnail: None, subtitles: vec![] };
    let Ok(entries) = std::fs::read_dir(dir) else {
        return out;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if !name.starts_with(video_id) {
            continue;
        }
        match path.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()) {
            Some(ext) if matches!(ext.as_str(), "opus" | "m4a" | "webm" | "mp3" | "ogg" | "wav") => {
                out.audio.push(path.clone());
            }
            Some(ext) if matches!(ext.as_str(), "jpg" | "jpeg" | "webp" | "png") => {
                if out.thumbnail.is_none() {
                    out.thumbnail = Some(path.clone());
                }
            }
            Some(ext) if ext == "vtt" || ext == "srt" || ext == "lrc" => {
                out.subtitles.push(path.clone());
            }
            _ => {}
        }
    }
    out.audio.sort();
    out.subtitles.sort();
    out
}

fn uuid_v4() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("imp-{now}-{n}")
}