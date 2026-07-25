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
