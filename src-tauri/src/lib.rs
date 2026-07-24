pub mod commands;
pub mod db;
pub mod services;
pub mod test_utils;

use crate::db::DbManager;
use tauri::Emitter;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub fn create_app_builder() -> tauri::Builder<tauri::Wry> {
    let db_manager = DbManager::open_in_memory().expect("Failed to initialize database");
    let quitting_flag = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .manage(db_manager)
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(move |window, event| {
            let label = window.label();
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if label == "main" {
                    api.prevent_close();
                    let _ = window.emit("app:quit-requested", ());

                    if !quitting_flag.swap(true, Ordering::SeqCst) {
                        let flag_clone = Arc::clone(&quitting_flag);
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_secs(4));
                            if flag_clone.load(Ordering::SeqCst) {
                                println!("[Tauri] Fallback force-quit triggered for main window.");
                                std::process::exit(0);
                            }
                        });
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::quit_app,
            commands::show_main_window,
            commands::open_release_page,
            commands::save_game_command,
            commands::authenticate_command
        ])
}

pub fn run() {
    create_app_builder()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
