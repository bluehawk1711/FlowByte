use tauri::{AppHandle, Manager, WebviewWindow};

const MINI_LABEL: &str = "mini";

fn mini_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(MINI_LABEL)
}

/// Show the always-on-top mini player and position it bottom-right of the
/// current monitor (falling back to wherever it was last).
#[tauri::command]
pub async fn show_mini_player(app: AppHandle) -> Result<(), String> {
    let win = mini_window(&app).ok_or("mini window not found")?;
    if let Ok(Some(monitor)) = win.current_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let w = (size.width as f64 / scale) as i32;
        let h = (size.height as f64 / scale) as i32;
        let win_size = win.outer_size().map_err(|e| e.to_string())?;
        let x = w - win_size.width as i32 - 24;
        let y = h - win_size.height as i32 - 72;
        let _ = win.set_position(tauri::PhysicalPosition::new(x.max(0), y.max(0)));
    }
    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn hide_mini_player(app: AppHandle) -> Result<(), String> {
    if let Some(win) = mini_window(&app) {
        let _ = win.hide();
    }
    Ok(())
}