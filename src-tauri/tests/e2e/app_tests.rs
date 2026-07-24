use archiv_des_vergessens_lib::services::auth::AuthService;
use archiv_des_vergessens_lib::services::game_loop::{GameLoopService, GameState};
use archiv_des_vergessens_lib::test_utils::MockTestContext;

#[tokio::test]
async fn test_full_application_e2e_flow() {
    let ctx = MockTestContext::new();

    // 1. User Registration / PBKDF2 Auth setup
    let salt = AuthService::generate_salt();
    let password = "E2E_Secure_Password_2026";
    let hash_obj = AuthService::hash_password(password, &salt).expect("E2E Hashing failed");

    let is_authed = AuthService::verify_password(password, &hash_obj.hash_hex, &hash_obj.salt_hex)
        .expect("E2E Verification failed");
    assert!(is_authed);

    // 2. Initial game state creation & active gameplay ticks
    let mut state = GameState {
        mneme_points: 0,
        base_generation_rate: 10,
        multiplier: 1.5,
        play_time_seconds: 0,
        last_tick_timestamp: 1000,
    };

    GameLoopService::process_tick(&mut state, 60); // 60s tick -> 10 * 1.5 * 60 = 900 mneme
    assert_eq!(state.mneme_points, 900);
    assert_eq!(state.play_time_seconds, 60);

    // 3. Offline progress calculation
    let offline_res = GameLoopService::calculate_offline_progress(&state, 1000 + 3600); // 1 hour offline
    assert_eq!(offline_res.elapsed_seconds, 3600);
    assert!(!offline_res.capped);

    // 4. Save game state to SQLite DB
    let save_id = ctx
        .db
        .save_game(
            "E2EPlayer",
            offline_res.new_total_mneme,
            state.play_time_seconds + 3600,
        )
        .expect("Database persistence failed");
    assert!(save_id > 0);

    // 5. Verify saved state retrieval
    let save = ctx
        .db
        .get_save("E2EPlayer")
        .expect("Database load failed")
        .unwrap();
    assert_eq!(save.player_name, "E2EPlayer");
    assert_eq!(save.mneme_points, offline_res.new_total_mneme);
}
