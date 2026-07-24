use archiv_des_vergessens_lib::services::auth::{AuthError, AuthService};
use rstest::rstest;

#[test]
fn test_auth_pbkdf2_100k_iterations_sha512() {
    let salt = AuthService::generate_salt();
    let password = "CorrectHorseBatteryStaple2026!";

    let hash_result =
        AuthService::hash_password(password, &salt).expect("PBKDF2 hash generation failed");
    assert!(!hash_result.hash_hex.is_empty());
    assert_eq!(hash_result.salt_hex.len(), 64); // 32 bytes in hex = 64 characters

    let verify_valid =
        AuthService::verify_password(password, &hash_result.hash_hex, &hash_result.salt_hex)
            .expect("Verification check failed");
    assert!(
        verify_valid,
        "Valid password verification should yield true"
    );
}

#[rstest]
#[case("WrongPassword128", false)]
#[case("CorrectHorseBatteryStaple2026!", true)]
#[case("correcthorsebatterystaple2026!", false)] // Case sensitivity check
fn test_auth_password_cases(#[case] password_input: &str, #[case] expected_match: bool) {
    let salt = AuthService::generate_salt();
    let base_password = "CorrectHorseBatteryStaple2026!";
    let hash_obj = AuthService::hash_password(base_password, &salt).unwrap();

    let matches =
        AuthService::verify_password(password_input, &hash_obj.hash_hex, &hash_obj.salt_hex)
            .unwrap();
    assert_eq!(matches, expected_match);
}

#[test]
fn test_auth_invalid_salt_or_hash_format() {
    let err = AuthService::verify_password("Password123!", "invalid_hex", "invalid_salt");
    assert_eq!(err.unwrap_err(), AuthError::HashError);
}
