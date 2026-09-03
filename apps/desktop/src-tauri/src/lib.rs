mod binaries;
mod downloader;
mod info;
mod mini;
mod music;
mod util;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                window.app_handle().exit(0);
            }
        })
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            info::get_video_info,
            downloader::start_download,
            downloader::cancel_download,
            music::start_music_import,
            music::cancel_music_import,
            music::read_file_bytes,
            music::delete_files,
            music::get_playlist_items,
            music::start_playlist_import,
            util::platform,
            mini::show_mini_player,
            mini::hide_mini_player,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Flowbyte");
}