use archiv_des_vergessens_lib::commands::validate_release_url;
use archiv_des_vergessens_lib::db::DbManager;
use archiv_des_vergessens_lib::services::auth::AuthService;

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
async fn test_authenticate_command_valid_and_invalid() {
    let salt = AuthService::generate_salt();
    let password = "CmdTestPassword2026!";
    let hash_obj = AuthService::hash_password(password, &salt).unwrap();

    let valid_res = AuthService::verify_password(password, &hash_obj.hash_hex, &hash_obj.salt_hex)
        .map_err(|e| e.to_string());
    assert_eq!(valid_res, Ok(true));

    let invalid_res =
        AuthService::verify_password("WrongCmdPassword", &hash_obj.hash_hex, &hash_obj.salt_hex)
            .map_err(|e| e.to_string());
    assert_eq!(invalid_res, Ok(false));
}
