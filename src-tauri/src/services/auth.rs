use crate::services::crypto::CryptoService;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha512;
use thiserror::Error;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LEN: usize = 32;
const KEY_LEN: usize = 64;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum AuthError {
    #[error("Invalid password or credentials mismatch")]
    InvalidCredentials,
    #[error("Password missing required length")]
    PasswordTooShort,
    #[error("Internal hashing or cryptographic error")]
    HashError,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PasswordHash {
    pub hash_hex: String,
    pub salt_hex: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Claims {
    pub sub: String,
    pub exp: u64,
    pub iat: u64,
}

/// Service for handling secure authentication with PBKDF2, Argon2id, and JWT tokens.
pub struct AuthService;

impl AuthService {
    /// Generates a random cryptographically secure 256-bit salt.
    pub fn generate_salt() -> [u8; SALT_LEN] {
        let mut salt = [0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// Hashes a password using Argon2id.
    pub fn hash_password_argon2(password: &str) -> Result<String, AuthError> {
        if password.len() < 8 {
            return Err(AuthError::PasswordTooShort);
        }
        CryptoService::hash_password_argon2(password).map_err(|_| AuthError::HashError)
    }

    /// Verifies a password against an Argon2id hash string.
    pub fn verify_password_argon2(password: &str, password_hash: &str) -> Result<bool, AuthError> {
        CryptoService::verify_password_argon2(password, password_hash)
            .map_err(|_| AuthError::HashError)
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

    /// Generates a signed JWT token with configurable expiration hours.
    pub fn generate_jwt_token(
        user_id: &str,
        jwt_secret: &str,
        token_expiry_hours: u64,
    ) -> Result<String, AuthError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| AuthError::HashError)?
            .as_secs();

        let exp = now + (token_expiry_hours * 3600);
        let claims = Claims {
            sub: user_id.to_string(),
            exp,
            iat: now,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(jwt_secret.as_bytes()),
        )
        .map_err(|_| AuthError::HashError)
    }

    /// Verifies a signed JWT token and returns the claims.
    pub fn verify_jwt_token(token: &str, jwt_secret: &str) -> Result<Claims, AuthError> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AuthError::InvalidCredentials)?;

        Ok(token_data.claims)
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
        assert_eq!(hashed.hash_hex.len(), KEY_LEN * 2);

        let is_valid = AuthService::verify_password(password, &hashed.hash_hex, &hashed.salt_hex)
            .expect("Verification should complete");
        assert!(is_valid);

        let is_invalid =
            AuthService::verify_password("WrongPassword123!", &hashed.hash_hex, &hashed.salt_hex)
                .expect("Verification should complete");
        assert!(!is_invalid);
    }

    #[test]
    fn test_argon2_hashing_in_auth_service() {
        let password = "SuperSecretArgon2Password!";
        let hash = AuthService::hash_password_argon2(password).unwrap();
        assert!(AuthService::verify_password_argon2(password, &hash).unwrap());
        assert!(!AuthService::verify_password_argon2("WrongPassword!", &hash).unwrap());
    }

    #[test]
    fn test_jwt_token_generation_and_verification() {
        let secret = "super_secret_jwt_key_2026_archiv_des_vergessens";
        let user_id = "user_42";

        let token = AuthService::generate_jwt_token(user_id, secret, 24)
            .expect("JWT creation should succeed");

        let claims =
            AuthService::verify_jwt_token(&token, secret).expect("JWT verification should succeed");

        assert_eq!(claims.sub, user_id);
        assert!(claims.exp > claims.iat);
    }

    #[test]
    fn test_jwt_token_invalid_secret_rejection() {
        let secret = "super_secret_jwt_key_2026_archiv_des_vergessens";
        let wrong_secret = "wrong_jwt_secret_key_12345";
        let user_id = "user_42";

        let token = AuthService::generate_jwt_token(user_id, secret, 24).unwrap();

        let result = AuthService::verify_jwt_token(&token, wrong_secret);
        assert_eq!(result.unwrap_err(), AuthError::InvalidCredentials);
    }
}
