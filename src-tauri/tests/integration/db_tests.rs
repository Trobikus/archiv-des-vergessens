use archiv_des_vergessens_lib::db::DbManager;

#[test]
fn test_db_isolation_between_concurrent_tests() {
    let db1 = DbManager::open_in_memory().expect("DB1 should open");
    let db2 = DbManager::open_in_memory().expect("DB2 should open");

    db1.save_game("Player1", 100, 10)
        .expect("Save in DB1 failed");

    // Verify DB2 is completely isolated and has no record of Player1
    let db2_save = db2.get_save("Player1").expect("DB2 query failed");
    assert!(
        db2_save.is_none(),
        "Database instances must remain strictly isolated"
    );
}

#[test]
fn test_db_save_game_crud_lifecycle() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");

    // Save initial game
    let save_id1 = db
        .save_game("Archivist", 1000, 300)
        .expect("Initial save failed");
    assert_eq!(save_id1, 1);

    // Save updated game state
    let save_id2 = db
        .save_game("Archivist", 2500, 600)
        .expect("Second save failed");
    assert_eq!(save_id2, 2);

    // Retrieve latest save
    let latest = db
        .get_save("Archivist")
        .expect("Fetch save failed")
        .unwrap();
    assert_eq!(latest.mneme_points, 2500);
    assert_eq!(latest.play_time_seconds, 600);
}

#[test]
fn test_db_file_backed_persistence_with_tempfile() {
    let temp_dir = tempfile::tempdir().expect("Tempdir creation failed");
    let db_path = temp_dir.path().join("test_game.db");
    let path_str = db_path.to_str().unwrap();

    {
        let db = DbManager::open_at_path(path_str).expect("Opening file DB failed");
        db.save_game("PersistentHero", 9999, 8888)
            .expect("Save failed");
    } // Connection closes here

    // Re-open database from disk and verify data persisted
    let db_reopened = DbManager::open_at_path(path_str).expect("Reopening file DB failed");
    let save = db_reopened
        .get_save("PersistentHero")
        .expect("Query failed")
        .unwrap();
    assert_eq!(save.mneme_points, 9999);
    assert_eq!(save.play_time_seconds, 8888);
}

#[test]
fn test_db_get_nonexistent_save() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");
    let save = db.get_save("Nobody").expect("Fetch should not error");
    assert!(save.is_none());
}

#[test]
fn test_db_save_game_multiple_players() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");
    db.save_game("Player1", 100, 10).unwrap();
    db.save_game("Player2", 200, 20).unwrap();

    let p1 = db.get_save("Player1").unwrap().unwrap();
    let p2 = db.get_save("Player2").unwrap().unwrap();

    assert_eq!(p1.mneme_points, 100);
    assert_eq!(p2.mneme_points, 200);
}

#[test]
fn test_db_save_game_overwrite_same_player() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");
    db.save_game("Hero", 50, 5).unwrap();
    db.save_game("Hero", 150, 15).unwrap();

    let p = db.get_save("Hero").unwrap().unwrap();
    assert_eq!(p.mneme_points, 150);
}

#[test]
fn test_db_save_game_zero_values() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");
    db.save_game("ZeroHero", 0, 0).unwrap();

    let p = db.get_save("ZeroHero").unwrap().unwrap();
    assert_eq!(p.mneme_points, 0);
    assert_eq!(p.play_time_seconds, 0);
}

#[test]
fn test_db_file_backed_persistence_with_corrupt_path() {
    let temp_dir = tempfile::tempdir().expect("Tempdir creation failed");
    let path_str = temp_dir.path().to_str().unwrap();

    let db = DbManager::open_at_path(path_str);
    assert!(db.is_err(), "Should fail to open a directory as a db");
}

#[test]
fn test_db_save_game_special_chars_name() {
    let db = DbManager::open_in_memory().expect("In-memory DB failed");
    let special_name = "Player_!@#$%^&*()";
    db.save_game(special_name, 100, 10).unwrap();

    let p = db.get_save(special_name).unwrap().unwrap();
    assert_eq!(p.mneme_points, 100);
}
