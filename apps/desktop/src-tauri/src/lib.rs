mod binaries;
mod downloader;
mod info;
mod mini;
mod music;
mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            info::get_video_info,
            downloader::start_download,
            downloader::cancel_download,
            music::start_music_import,
            music::cancel_music_import,
            music::read_file_bytes,
            music::delete_files,
            util::platform,
            mini::show_mini_player,
            mini::hide_mini_player,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Flowbyte");
}