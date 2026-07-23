// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Emitter};

// Command to transition from launcher to main game
#[tauri::command]
fn launch_game(app: AppHandle) {
    // 1. Show and focus the main window in fullscreen
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.set_fullscreen(true);
        let _ = main_win.show();
        let _ = main_win.set_focus();
        let _ = main_win.emit("launcher:game-launched", ());
    }
    // 2. Close the launcher window slightly delayed (200ms) so main window is fully rendered & painted
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if let Some(launcher_win) = app.get_webview_window("launcher") {
            let _ = launcher_win.close();
        }
    });
}

// Command to force-quit the application (called when savegame is fully written)
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// Command to safely close the launcher window
#[tauri::command]
fn close_launcher(app: AppHandle) {
    if let Some(launcher_win) = app.get_webview_window("launcher") {
        let _ = launcher_win.close();
    }
}

// Command to show the launcher window smoothly
#[tauri::command]
fn show_launcher(app: AppHandle) {
    if let Some(launcher_win) = app.get_webview_window("launcher") {
        let _ = launcher_win.show();
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

                        // Fallback force-quit: If the frontend doesn't call quit_app within 4 seconds, force exit!
                        // This prevents zombie background processes if the saving fails or gets stuck.
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_secs(4));
                            println!("[Tauri] Fallback force-quit triggered for main window.");
                            std::process::exit(0);
                        });
                    } else if label == "launcher" {
                        // If the launcher window is closed, check if the main game window is visible.
                        // If it is not visible, it means the user closed the launcher instead of launching the game.
                        // In this case, we must exit the application completely.
                        let app = window.app_handle();
                        let main_visible = app.get_webview_window("main")
                            .and_then(|w| w.is_visible().ok())
                            .unwrap_or(false);
                        if !main_visible {
                            println!("[Tauri] Launcher closed and game not visible. Exiting application.");
                            app.exit(0);
                            // Fallback to guarantee process termination in all cases
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_secs(1));
                                std::process::exit(0);
                            });
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![launch_game, quit_app, close_launcher, show_launcher])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
