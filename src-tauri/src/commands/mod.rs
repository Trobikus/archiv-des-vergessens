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

    if !target_url.starts_with("https://github.com/Trobikus/archiv-des-vergessens") {
        return Err("Sicherheitsverletzung: URL nicht erlaubt.".into());
    }

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
