// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Emitter};

// Command to transition from launcher to main game
#[tauri::command]
fn launch_game(app: AppHandle) {
    // 1. Show and focus the main window
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
    // 2. Close the launcher window
    if let Some(launcher_win) = app.get_webview_window("launcher") {
        let _ = launcher_win.close();
    }
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
        .on_window_event(|window, event| {
            // Safe-close system: Intercept close request for main game window
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close(); // Prevent immediate close
                    let _ = window.emit("app:quit-requested", ()); // Notify frontend to save and quit
                }
            }
        })
        .invoke_handler(tauri::generate_handler![launch_game, quit_app, close_launcher, show_launcher])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
