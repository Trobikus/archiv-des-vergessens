// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub download_url: String,
    pub release_notes: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProgressPayload {
    pub percent: u32,
    pub downloaded: u64,
    pub total: u64,
    pub status: String,
}

fn get_game_dir() -> Result<PathBuf, String> {
    let mut path =
        dirs::data_dir().ok_or_else(|| "Konnte APPDATA Verzeichnis nicht ermitteln".to_string())?;
    path.push("ArchivDesVergessens");
    path.push("app");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn get_version_file_path() -> Result<PathBuf, String> {
    let mut dir = get_game_dir()?;
    dir.push("version.json");
    Ok(dir)
}

fn get_executable_path() -> Result<PathBuf, String> {
    let dir = get_game_dir()?;
    let exe1 = dir.join("archiv-des-vergessens.exe");
    if exe1.exists() {
        return Ok(exe1);
    }
    let exe2 = dir.join("ArchivDesVergessens.exe");
    if exe2.exists() {
        return Ok(exe2);
    }
    Ok(exe1)
}

// 1. Get currently installed game version
#[tauri::command]
fn get_installed_game_version() -> Result<Option<String>, String> {
    let exe_path = get_executable_path()?;
    if !exe_path.exists() {
        return Ok(None);
    }

    let version_file = get_version_file_path()?;
    if version_file.exists() {
        if let Ok(content) = fs::read_to_string(&version_file) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(version_str) = v["version"].as_str() {
                    return Ok(Some(version_str.to_string()));
                }
            }
        }
    }

    // Fallback: If EXE exists but version.json doesn't, assume 1.0.0
    Ok(Some("1.0.0".to_string()))
}

// 2. Query latest GitHub release
#[tauri::command]
async fn check_github_release() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("ArchivDesVergessensLauncher/1.0"),
    );

    let res = client
        .get("https://api.github.com/repos/Trobikus/archiv-des-vergessens/releases/latest")
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("GitHub API Anfrage fehlgeschlagen: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("GitHub API HTTP Status: {}", res.status()));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Fehler beim Parsen der GitHub Release JSON: {}", e))?;

    let tag_name = json["tag_name"]
        .as_str()
        .or_else(|| json["name"].as_str())
        .unwrap_or("v1.0.0")
        .to_string();

    let release_notes = json["body"].as_str().unwrap_or("").to_string();

    // Search for a ZIP asset
    let mut download_url = format!(
        "https://github.com/Trobikus/archiv-des-vergessens/releases/download/{}/archiv-des-vergessens.zip",
        tag_name
    );

    if let Some(assets) = json["assets"].as_array() {
        for asset in assets {
            if let Some(name) = asset["name"].as_str() {
                if name.ends_with(".zip") {
                    if let Some(url) = asset["browser_download_url"].as_str() {
                        download_url = url.to_string();
                        break;
                    }
                }
            }
        }
    }

    Ok(ReleaseInfo {
        tag_name,
        download_url,
        release_notes,
    })
}

// 3. Download and extract game ZIP
#[tauri::command]
async fn download_and_extract_game(
    app: AppHandle,
    download_url: String,
    version: String,
) -> Result<(), String> {
    let game_dir = get_game_dir()?;
    let temp_zip_path = game_dir.parent().unwrap().join("temp_download.zip");

    // [Production] Logging entfernt

    // Emit initial event
    let _ = app.emit(
        "download_progress",
        ProgressPayload {
            percent: 0,
            downloaded: 0,
            total: 0,
            status: "Starte Download...".to_string(),
        },
    );

    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("ArchivDesVergessensLauncher/1.0"),
    );

    let response = client
        .get(&download_url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("Download-Anfrage fehlgeschlagen: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download HTTP Status: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let mut file = File::create(&temp_zip_path)
        .map_err(|e| format!("Konnte temporäre Datei nicht erstellen: {}", e))?;

    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Fehler beim Download-Stream: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Fehler beim Schreiben der Datei: {}", e))?;

        downloaded += chunk.len() as u64;

        let percent = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0) as u32
        } else {
            0
        };

        let _ = app.emit(
            "download_progress",
            ProgressPayload {
                percent,
                downloaded,
                total: total_size,
                status: format!("Lade herunter... {}%", percent),
            },
        );
    }

    drop(file);

    // Emit extraction status
    let _ = app.emit(
        "download_progress",
        ProgressPayload {
            percent: 100,
            downloaded,
            total: total_size,
            status: "Entpacke Spieldateien...".to_string(),
        },
    );

    // Extract ZIP file
    let zip_file = File::open(&temp_zip_path)
        .map_err(|e| format!("Konnte heruntergeladenes Archiv nicht öffnen: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(zip_file).map_err(|e| format!("Ungültiges ZIP-Archiv: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Zip-Eintrag Fehler: {}", e))?;

        let outpath = match file.enclosed_name() {
            Some(path) => game_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath)
                .map_err(|e| format!("Konnte Ziel-Datei nicht erstellen ({:?}): {}", outpath, e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Konnte Ziel-Datei nicht schreiben: {}", e))?;
        }
    }

    // Clean up temporary ZIP
    let _ = fs::remove_file(&temp_zip_path);

    // Save installed version metadata
    let version_data = serde_json::json!({
        "version": version,
        "installed_at": chrono_like_now()
    });
    let version_path = get_version_file_path()?;
    let _ = fs::write(
        version_path,
        serde_json::to_string_pretty(&version_data).unwrap_or_default(),
    );

    let _ = app.emit(
        "download_progress",
        ProgressPayload {
            percent: 100,
            downloaded,
            total: total_size,
            status: "Fertiggestellt!".to_string(),
        },
    );

    Ok(())
}

fn chrono_like_now() -> String {
    format!("{:?}", std::time::SystemTime::now())
}

// 4. Launch installed game EXE
#[tauri::command]
fn launch_installed_game(app: AppHandle) -> Result<(), String> {
    let exe_path = get_executable_path()?;
    if !exe_path.exists() {
        return Err("Spieldatei (ArchivDesVergessens.exe) wurde nicht gefunden. Bitte installiere das Spiel zuerst.".to_string());
    }

    // [Production] Logging entfernt

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW = 0x08000000, DETACHED_PROCESS = 0x00000008
        std::process::Command::new(&exe_path)
            .current_dir(exe_path.parent().unwrap())
            .creation_flags(0x00000008)
            .spawn()
            .map_err(|e| format!("Konnte Prozess nicht starten: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new(&exe_path)
            .current_dir(exe_path.parent().unwrap())
            .spawn()
            .map_err(|e| format!("Konnte Prozess nicht starten: {}", e))?;
    }

    // Exit launcher smoothly after spawning main game
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        app.exit(0);
    });

    Ok(())
}

// 5. Close launcher window
#[tauri::command]
fn close_launcher(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_installed_game_version,
            check_github_release,
            download_and_extract_game,
            launch_installed_game,
            close_launcher
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Launcher-Anwendung");
}
