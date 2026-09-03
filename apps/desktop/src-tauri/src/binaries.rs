use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// Resolve the path to a bundled binary (yt-dlp / ffmpeg).
/// 1. Dev: src-tauri/bin/{win,mac,linux}/{name}.exe
/// 2. Packaged: resources/bin/{win,mac,linux}/{name}.exe
/// 3. System PATH fallback (which / where)
pub fn resolve_binary(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let platform_dir = match std::env::consts::OS {
        "windows" => "win",
        "macos" => "mac",
        _ => "linux",
    };
    let exe_name = if std::env::consts::OS == "windows" {
        format!("{name}.exe")
    } else {
        name.to_string()
    };

    // 1. Dev path
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(platform_dir)
        .join(&exe_name);
    if dev_path.exists() {
        return Ok(dev_path);
    }

    // 2. Packaged resource path
    if let Ok(resource_path) = app
        .path()
        .resource_dir()
        .map(|p| p.join("bin").join(platform_dir).join(&exe_name))
    {
        if resource_path.exists() {
            return Ok(resource_path);
        }
    }

    // 3. System PATH fallback
    if let Ok(output) = std::process::Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg(&exe_name)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // `where` returns one path per line; take the first
            if let Some(first_line) = stdout.lines().next() {
                let path = PathBuf::from(first_line.trim());
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    Err(format!(
        "Binary '{}' not found. Install it or place it in: {} (dev) or resources/bin/{}/",
        name,
        dev_path.display(),
        platform_dir
    ))
}

/// Stable folder where imported songs are downloaded so they stay playable
/// locally across restarts (`~/Downloads/Flowbyte Imports`). Files are only
/// removed when the user uploads them to the library or deletes them — the
/// frontend never auto-uploads.
pub fn import_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = dirs::download_dir()
        .or_else(|| app.path().app_cache_dir().ok())
        .ok_or_else(|| "no downloads directory available".to_string())?;
    let dir = base.join("Flowbyte Imports");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create import dir: {e}"))?;
    Ok(dir)
}