use std::path::PathBuf;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub success: bool,
    pub title: String,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub views: Option<i64>,
    pub upload_date: Option<String>,
    pub video_id: Option<String>,
    pub extractor: Option<String>,
    pub error: Option<String>,
    pub message: Option<String>,
}

impl VideoInfo {
    fn error(msg: String) -> Self {
        VideoInfo {
            success: false,
            title: String::new(),
            uploader: None,
            duration: None,
            thumbnail: None,
            views: None,
            upload_date: None,
            video_id: None,
            extractor: None,
            error: Some("Invalid or unsupported URL".into()),
            message: Some(msg),
        }
    }
}

/// Port of the Electron app's POST /get-video-info (yt-dlp --print-json).
#[tauri::command]
pub async fn get_video_info(app: tauri::AppHandle, url: String) -> Result<VideoInfo, String> {
    let ytdlp = crate::binaries::resolve_binary(&app, "yt-dlp")?;

    let output = tokio::process::Command::new(&ytdlp)
        .args([
            "--print-json",
            "--skip-download",
            "--no-check-formats",
            "--no-warnings",
            "--no-check-certificate",
            "--playlist-items",
            "1",
        ])
        .arg(&url)
        .output()
        .await
        .map_err(|e| format!("failed to run yt-dlp: {e}"))?;

    if !output.status.success() {
        return Ok(VideoInfo::error(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first_line = stdout
        .lines()
        .next()
        .ok_or_else(|| "empty yt-dlp output".to_string())?;

    let v: serde_json::Value =
        serde_json::from_str(first_line).map_err(|e| format!("parse yt-dlp JSON: {e}"))?;

    let video_id = v
        .get("id")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    Ok(VideoInfo {
        success: true,
        title: v.get("title").and_then(|x| x.as_str()).unwrap_or_default().to_string(),
        uploader: v.get("uploader").and_then(|x| x.as_str()).map(|s| s.to_string()),
        duration: v.get("duration").and_then(|x| x.as_f64()),
        thumbnail: v.get("thumbnail").and_then(|x| x.as_str()).map(|s| s.to_string()),
        views: v.get("view_count").and_then(|x| x.as_i64()),
        upload_date: v.get("upload_date").and_then(|x| x.as_str()).map(|s| s.to_string()),
        video_id,
        extractor: v.get("extractor").and_then(|x| x.as_str()).map(|s| s.to_string()),
        error: None,
        message: None,
    })
}

/// Non-public helper: video metadata used by the music import pipeline.
pub async fn fetch_metadata(
    ytdlp: &PathBuf,
    url: &str,
) -> Result<serde_json::Value, String> {
    let output = tokio::process::Command::new(ytdlp)
        .args([
            "--print-json",
            "--skip-download",
            "--no-check-formats",
            "--no-warnings",
            "--no-check-certificate",
            "--playlist-items",
            "1",
        ])
        .arg(url)
        .output()
        .await
        .map_err(|e| format!("failed to run yt-dlp: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let first_line = stdout.lines().next().ok_or("empty output")?;
    serde_json::from_str(first_line).map_err(|e| format!("parse yt-dlp JSON: {e}"))
}