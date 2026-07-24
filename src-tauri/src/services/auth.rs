use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha512;
use thiserror::Error;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LEN: usize = 32;
const KEY_LEN: usize = 64;

#[derive(Debug, Error, PartialEq)]
pub enum AuthError {
    #[error("Invalid password or hash mismatch")]
    InvalidCredentials,
    #[error("Password missing required length")]
    PasswordTooShort,
    #[error("Internal hashing error")]
    HashError,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PasswordHash {
    pub hash_hex: String,
    pub salt_hex: String,
}

/// Service for handling secure authentication with PBKDF2 (HMAC-SHA512, 100,000 iterations).
pub struct AuthService;

impl AuthService {
    /// Generates a random cryptographically secure 256-bit salt.
    pub fn generate_salt() -> [u8; SALT_LEN] {
        let mut salt = [0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// Hashes a password using PBKDF2 with HMAC-SHA512 and 100,000 iterations.
    pub fn hash_password(password: &str, salt: &[u8]) -> Result<PasswordHash, AuthError> {
        if password.len() < 8 {
            return Err(AuthError::PasswordTooShort);
        }

        let mut key = [0u8; KEY_LEN];
        pbkdf2_hmac::<Sha512>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);

        Ok(PasswordHash {
            hash_hex: hex::encode(&key),
            salt_hex: hex::encode(salt),
        })
    }

    /// Verifies a plain password against a stored PBKDF2 hash and salt.
    pub fn verify_password(
        password: &str,
        stored_hash_hex: &str,
        stored_salt_hex: &str,
    ) -> Result<bool, AuthError> {
        let salt = hex::decode(stored_salt_hex).map_err(|_| AuthError::HashError)?;
        let expected_hash = hex::decode(stored_hash_hex).map_err(|_| AuthError::HashError)?;

        if salt.len() != SALT_LEN || expected_hash.len() != KEY_LEN {
            return Err(AuthError::HashError);
        }

        let mut computed_key = [0u8; KEY_LEN];
        pbkdf2_hmac::<Sha512>(
            password.as_bytes(),
            &salt,
            PBKDF2_ITERATIONS,
            &mut computed_key,
        );

        // Constant-time comparison to prevent timing side-channel attacks
        let matches =
            subtle::ConstantTimeEq::ct_eq(computed_key.as_slice(), expected_hash.as_slice());
        Ok(matches)
    }
}

// Helper hex encoder/decoder module for zero extra external dependency overhead
mod hex {
    pub fn encode(data: &[u8]) -> String {
        data.iter().map(|b| format!("{:02x}", b)).collect()
    }

    #[allow(clippy::manual_is_multiple_of)]
    pub fn decode(hex: &str) -> Result<Vec<u8>, ()> {
        if hex.len() % 2 != 0 {
            return Err(());
        }
        (0..hex.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|_| ()))
            .collect()
    }
}

// Minimal subtle constant time fallback
mod subtle {
    pub struct ConstantTimeEq;
    impl ConstantTimeEq {
        pub fn ct_eq(a: &[u8], b: &[u8]) -> bool {
            if a.len() != b.len() {
                return false;
            }
            let mut result = 0u8;
            for (x, y) in a.iter().zip(b.iter()) {
                result |= x ^ y;
            }
            result == 0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pbkdf2_hashing_and_verification() {
        let salt = AuthService::generate_salt();
        let password = "SuperSecretPassword2026!";

        let hashed = AuthService::hash_password(password, &salt).expect("Hashing should succeed");

        assert_eq!(hashed.salt_hex, hex::encode(&salt));
        assert_eq!(hashed.hash_hex.len(), KEY_LEN * 2); // Hex encoded 64 bytes = 128 chars

        let is_valid = AuthService::verify_password(password, &hashed.hash_hex, &hashed.salt_hex)
            .expect("Verification should complete");
        assert!(is_valid, "Correct password should match");

        let is_invalid =
            AuthService::verify_password("WrongPassword123!", &hashed.hash_hex, &hashed.salt_hex)
                .expect("Verification should complete");
        assert!(!is_invalid, "Incorrect password must be rejected");
    }

    #[test]
    fn test_short_password_rejection() {
        let salt = AuthService::generate_salt();
        let result = AuthService::hash_password("short", &salt);
        assert_eq!(result.unwrap_err(), AuthError::PasswordTooShort);
    }
}
