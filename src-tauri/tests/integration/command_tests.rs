use archiv_des_vergessens_lib::commands::validate_release_url;
use archiv_des_vergessens_lib::db::DbManager;

#[tokio::test]
async fn test_save_game_command_execution() {
    let db = DbManager::open_in_memory().expect("Database init failed");

    let result = db.save_game("HeroCommand", 15000, 3600);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 1);

    let saved = db.get_save("HeroCommand").unwrap().unwrap();
    assert_eq!(saved.mneme_points, 15000);
}

#[tokio::test]
async fn test_open_release_page_command() {
    let result = validate_release_url(Some(
        "https://github.com/Trobikus/archiv-des-vergessens/releases/latest".to_string(),
    ));
    assert!(result.is_ok());
    assert_eq!(
        result.unwrap(),
        "https://github.com/Trobikus/archiv-des-vergessens/releases/latest"
    );
}

#[tokio::test]
async fn test_open_release_page_invalid_url() {
    let result = validate_release_url(Some("https://evil-site.com/malware".to_string()));
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Ungültige URL");
}

#[tokio::test]
async fn test_validate_release_url_none() {
    let result = validate_release_url(None);
    assert!(result.is_ok());
    assert_eq!(
        result.unwrap(),
        "https://github.com/Trobikus/archiv-des-vergessens/releases/latest"
    );
}

#[tokio::test]
async fn test_validate_release_url_valid_different() {
    let result = validate_release_url(Some(
        "https://github.com/Trobikus/archiv-des-vergessens/releases/tag/v1.0.0".to_string(),
    ));
    assert!(result.is_ok());
    assert_eq!(
        result.unwrap(),
        "https://github.com/Trobikus/archiv-des-vergessens/releases/tag/v1.0.0"
    );
}

#[tokio::test]
async fn test_save_game_command_execution_update() {
    let db = DbManager::open_in_memory().expect("Database init failed");
    db.save_game("HeroCommand", 15000, 3600).unwrap();
    let result = db.save_game("HeroCommand", 20000, 4000);
    assert!(result.is_ok());

    let saved = db.get_save("HeroCommand").unwrap().unwrap();
    assert_eq!(saved.mneme_points, 20000);
}

#[tokio::test]
async fn test_save_game_command_max_points() {
    let db = DbManager::open_in_memory().expect("Database init failed");
    let max_val = i64::MAX as u64;
    let result = db.save_game("HeroCommand", max_val, 3600);
    assert!(result.is_ok());
    let saved = db.get_save("HeroCommand").unwrap().unwrap();
    assert_eq!(saved.mneme_points, max_val);
}

#[tokio::test]
async fn test_save_game_command_long_name() {
    let db = DbManager::open_in_memory().expect("Database init failed");
    let name = "A".repeat(255);
    let result = db.save_game(&name, 100, 100);
    assert!(result.is_ok());
    let saved = db.get_save(&name).unwrap().unwrap();
    assert_eq!(saved.mneme_points, 100);
}

#[tokio::test]
async fn test_save_game_command_empty_name() {
    let db = DbManager::open_in_memory().expect("Database init failed");
    let result = db.save_game("", 100, 100);
    assert!(result.is_ok());
    let saved = db.get_save("").unwrap().unwrap();
    assert_eq!(saved.mneme_points, 100);
}
