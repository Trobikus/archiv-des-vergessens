use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

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

/// Validiert, dass die URL auf das GitHub-Repository zeigt.
pub fn validate_release_url(url: Option<String>) -> Result<String, String> {
    let target_url = url.unwrap_or_else(|| {
        "https://github.com/Trobikus/archiv-des-vergessens/releases/latest".to_string()
    });

    if !target_url.starts_with("https://github.com/Trobikus/archiv-des-vergessens") {
        return Err("Ungültige URL".into());
    }

    Ok(target_url)
}

/// Öffnet die GitHub-Release-Seite im Standard-Browser.
#[tauri::command]
pub fn open_release_page(app: AppHandle, url: Option<String>) -> Result<String, String> {
    let target_url = validate_release_url(url)?;

    app.opener()
        .open_url(&target_url, None::<&str>)
        .map_err(|e| format!("Fehler beim Öffnen der URL: {e}"))?;

    Ok(target_url)
}

// ============================================================
// DEPRECATED: Unused legacy offline infrastructure
// ============================================================
// Native SQLite commands (`save_game_command`, `authenticate_command`) and
// offline modules (`auth.rs`, `crypto.rs`) are deprecated and excluded from
// active IPC invocation handlers to minimize attack surface.
// ============================================================
