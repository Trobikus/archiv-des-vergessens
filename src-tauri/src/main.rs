// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Emitter};

// Command to force-quit the application (called when savegame is fully written)
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// Command to show the main window smoothly once initial rendering is completed
#[tauri::command]
fn show_main_window(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
}

// Command to open external URLs in default browser
#[tauri::command]
fn open_release_page(url: Option<String>) {
    let target_url = url.unwrap_or_else(|| "https://github.com/Trobikus/archiv-des-vergessens/releases/latest".to_string());
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd").args(["/C", "start", "", &target_url]).spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&target_url).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&target_url).spawn();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(|window, event| {
            let label = window.label();
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    if label == "main" {
                        api.prevent_close(); // Prevent immediate close
                        let _ = window.emit("app:quit-requested", ()); // Notify frontend to save and quit

                        // Fallback force-quit: If frontend doesn't call quit_app within 4 seconds, force exit!
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_secs(4));
                            println!("[Tauri] Fallback force-quit triggered for main window.");
                            std::process::exit(0);
                        });
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![quit_app, show_main_window, open_release_page])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
