use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// Resolve the path to a bundled binary (yt-dlp / ffmpeg).
/// Dev: src-tauri/bin/{win,mac,linux}/{name}.exe
/// Packaged: resources/bin/{win,mac,linux}/{name}.exe
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

    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(platform_dir)
        .join(&exe_name);
    if dev_path.exists() {
        return Ok(dev_path);
    }

    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource dir: {e}"))?
        .join("bin")
        .join(platform_dir)
        .join(&exe_name);
    if resource_path.exists() {
        return Ok(resource_path);
    }

    Err(format!(
        "Bundled binary not found: {} (dev) / {} (resources)",
        dev_path.display(),
        resource_path.display()
    ))
}

/// Directory where music imports are staged before upload.
pub fn import_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("cache dir: {e}"))?;
    let dir = cache.join("imports");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create import dir: {e}"))?;
    Ok(dir)
}