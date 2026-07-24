use crate::db::DbManager;
use crate::services::auth::AuthService;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
pub fn open_release_page(url: Option<String>) -> Result<String, String> {
    let target_url = url.unwrap_or_else(|| {
        "https://github.com/Trobikus/archiv-des-vergessens/releases/latest".to_string()
    });

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &target_url])
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&target_url).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&target_url)
            .spawn();
    }

    Ok(target_url)
}

#[tauri::command]
pub fn save_game_command(
    player_name: String,
    mneme_points: u64,
    play_time: u64,
    db_state: tauri::State<'_, DbManager>,
) -> Result<i64, String> {
    if player_name.trim().is_empty() {
        return Err("Player name cannot be empty".to_string());
    }

    db_state
        .save_game(&player_name, mneme_points, play_time)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn authenticate_command(
    password: String,
    stored_hash: String,
    stored_salt: String,
) -> Result<bool, String> {
    AuthService::verify_password(&password, &stored_hash, &stored_salt).map_err(|e| e.to_string())
}
