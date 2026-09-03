use std::path::{Path, PathBuf};
use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::binaries;
use crate::downloader::{broadcast_progress, ActiveChild};

static ACTIVE: Lazy<Mutex<std::collections::HashMap<String, ActiveChild>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

#[derive(serde::Deserialize, Serialize, Clone)]
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

/// A single item from a YouTube playlist, returned by `get_playlist_items`.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistItem {
    pub index: u32,
    pub video_id: String,
    pub title: String,
    pub url: String,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub channel: Option<String>,
}

/// Result of fetching playlist metadata + items.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistInfo {
    pub title: String,
    pub item_count: u32,
    pub items: Vec<PlaylistItem>,
}

fn codec_from_ext(ext: &str) -> String {
    match ext.to_ascii_lowercase().as_str() {
        "opus" | "ogg" => "opus".to_string(),
        "m4a" | "mp4" => "aac".to_string(),
        "webm" => "opus".to_string(),
        "mp3" => "mp3".to_string(),
        "wav" => "pcm".to_string(),
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

/// Read a local file as base64 string (used to upload staged audio/artwork to the API).
#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<String, String> {
    use base64::Engine;
    let data = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("read {path}: {e}"))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(data))
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

/// Fetch all items in a YouTube playlist using yt-dlp --flat-playlist.
/// Returns playlist metadata + item list without downloading anything.
#[tauri::command]
pub async fn get_playlist_items(app: AppHandle, url: String) -> Result<PlaylistInfo, String> {
    let ytdlp = crate::binaries::resolve_binary(&app, "yt-dlp")?;

    // Get playlist title + item count
    let meta_output = tokio::process::Command::new(&ytdlp)
        .args([
            "--flat-playlist",
            "--print",
            "%(playlist_title)s|||%(playlist_count)s",
            "--playlist-items",
            "1",
            "--no-warnings",
            "--no-check-certificate",
        ])
        .arg(&url)
        .output()
        .await
        .map_err(|e| format!("failed to run yt-dlp: {e}"))?;

    let meta_stdout = String::from_utf8_lossy(&meta_output.stdout);
    let first_line = meta_stdout.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.splitn(2, "|||").collect();
    let title = parts.first().map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or("Unknown Playlist");
    let item_count: u32 = parts.get(1).and_then(|s| s.trim().parse().ok()).unwrap_or(0);

    // Get all items as JSON lines
    let items_output = tokio::process::Command::new(&ytdlp)
        .args([
            "--flat-playlist",
            "-j",
            "--no-warnings",
            "--no-check-certificate",
            "--ignore-errors",
        ])
        .arg(&url)
        .output()
        .await
        .map_err(|e| format!("failed to run yt-dlp: {e}"))?;

    let items_stdout = String::from_utf8_lossy(&items_output.stdout);
    let mut items = Vec::new();

    for (i, line) in items_stdout.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            let video_id = v.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string();
            if video_id.is_empty() {
                continue;
            }
            let item_title = v.get("title").and_then(|x| x.as_str()).unwrap_or("Untitled").to_string();
            let item_url = v.get("url").and_then(|x| x.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={video_id}"));
            let thumbnail = v.get("thumbnail").and_then(|x| x.as_str()).map(|s| s.to_string());
            let duration = v.get("duration").and_then(|x| x.as_f64());
            let channel = v.get("channel").and_then(|x| x.as_str())
                .or_else(|| v.get("uploader").and_then(|x| x.as_str()))
                .map(|s| s.to_string());

            items.push(PlaylistItem {
                index: (i as u32) + 1,
                video_id,
                title: item_title,
                url: item_url,
                thumbnail,
                duration,
                channel,
            });
        }
    }

    Ok(PlaylistInfo {
        title: title.to_string(),
        item_count: if item_count > 0 { item_count } else { items.len() as u32 },
        items,
    })
}

/// Import an entire playlist into the library.
/// Legacy batched playlist import (download-only). The desktop UI now runs
/// playlist imports as individual, cancellable per-song jobs instead — this
/// command is kept for backwards compatibility and emits per-item events.
#[tauri::command]
pub async fn start_playlist_import(
    app: AppHandle,
    url: String,
    opts: Option<MusicImportOptions>,
) -> Result<String, String> {
    let playlist_id = uuid_v4();
    let ytdlp = crate::binaries::resolve_binary(&app, "yt-dlp")?;
    let ffmpeg = crate::binaries::resolve_binary(&app, "ffmpeg")?;
    let import_dir = crate::binaries::import_dir(&app)?;

    let bitrate = opts.as_ref().and_then(|o| o.bitrate).unwrap_or(160).clamp(64, 320);
    let transcode = opts.as_ref().and_then(|o| o.transcode).unwrap_or(false);

    // Get playlist items first
    let info = get_playlist_items(app.clone(), url.clone()).await?;
    let total_items = info.items.len() as u32;

    if total_items == 0 {
        return Err("Playlist is empty".into());
    }

    // Emit initial progress
    let mut progress = crate::downloader::DownloadProgress::new("preparing");
    progress.detail = format!("Found {} items in playlist", total_items);
    progress.percent = 0.0;
    let _ = app.emit("playlist-import-progress", serde_json::json!({
        "playlistId": playlist_id,
        "totalItems": total_items,
        "currentIndex": 0,
        "currentTitle": "",
        "status": "starting",
        "detail": progress.detail,
    }));

    // Clone items for the spawned task
    let items = info.items.clone();
    let app2 = app.clone();

    // Spawn the batch import task (non-blocking)
    let playlist_id_clone = playlist_id.clone();
    tauri::async_runtime::spawn(async move {
        let mut imported = 0u32;
        let mut failed = 0u32;

        for (i, item) in items.iter().enumerate() {
            // Emit per-item progress
            let _ = app2.emit("playlist-import-progress", serde_json::json!({
                "playlistId": playlist_id_clone,
                "totalItems": total_items,
                "currentIndex": i as u32 + 1,
                "currentTitle": item.title,
                "imported": imported,
                "failed": failed,
                "status": "importing",
                "detail": format!("Importing {}/{}: {}", i + 1, total_items, item.title),
            }));

            // Run the single-item import pipeline
            match import_single_item(&app2, &ytdlp, &ffmpeg, &import_dir, &item.url, bitrate, transcode).await {
                Ok(result) => {
                    imported += 1;
                    // Emit the same "music-import-done" event so the frontend upload pipeline picks it up
                    let _ = app2.emit("music-import-done", (result.id.clone(), result));
                }
                Err(e) => {
                    failed += 1;
                    let _ = app2.emit("playlist-import-progress", serde_json::json!({
                        "playlistId": playlist_id_clone,
                        "totalItems": total_items,
                        "currentIndex": i as u32 + 1,
                        "currentTitle": item.title,
                        "imported": imported,
                        "failed": failed,
                        "status": "item_failed",
                        "detail": format!("Failed: {} — {}", item.title, e),
                    }));
                }
            }
        }

        // Emit completion
        let final_status = if failed == 0 { "completed" } else { "completed_with_errors" };
        let _ = app2.emit("playlist-import-progress", serde_json::json!({
            "playlistId": playlist_id_clone,
            "totalItems": total_items,
            "currentIndex": total_items,
            "imported": imported,
            "failed": failed,
            "status": final_status,
            "detail": format!("Done: {} imported, {} failed", imported, failed),
        }));
    });

    Ok(playlist_id)
}

/// Single-item import pipeline (download + stage files, returns MusicImportResult).
async fn import_single_item(
    _app: &AppHandle,
    ytdlp: &PathBuf,
    ffmpeg: &PathBuf,
    import_dir: &PathBuf,
    url: &str,
    bitrate: u32,
    transcode: bool,
) -> Result<MusicImportResult, String> {
    // 1) Fetch metadata
    let meta = crate::info::fetch_metadata(ytdlp, url).await
        .map_err(|e| format!("video info failed: {e}"))?;

    let title = meta.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled").to_string();
    let video_id = meta.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let artist = meta.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string());
    let duration = meta.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let year: Option<i32> = meta.get("upload_date").and_then(|v| v.as_str())
        .and_then(|d| d.get(..4)).and_then(|y| y.parse().ok());
    let abr: Option<i64> = meta.get("abr").and_then(|v| v.as_i64());
    let source_url = meta.get("webpage_url").and_then(|v| v.as_str()).unwrap_or(url).to_string();

    if duration <= 0.0 {
        return Err("Could not determine video duration (private / live stream?)".into());
    }

    // 2) Download audio
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
    args.push(url.to_string());

    let output = tokio::process::Command::new(ytdlp)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("spawn yt-dlp: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr.trim()));
    }

    // 3) Collect output files
    let files = collect_outputs(import_dir, &video_id);
    if files.audio.is_empty() {
        return Err("yt-dlp finished without producing audio".into());
    }

    let audio_ext = files.audio[0].extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let id = uuid_v4();
    Ok(MusicImportResult {
        id,
        title,
        artist,
        duration,
        video_id,
        source_url,
        year,
        audio_path: files.audio[0].to_string_lossy().to_string(),
        audio_codec: codec_from_ext(&audio_ext),
        audio_bitrate: if transcode { Some(bitrate as i64) } else { abr },
        thumbnail_path: files.thumbnail.map(|p| p.to_string_lossy().to_string()),
        subtitle_paths: files.subtitles.iter().map(|p| p.to_string_lossy().to_string()).collect(),
    })
}