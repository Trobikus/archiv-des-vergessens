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
