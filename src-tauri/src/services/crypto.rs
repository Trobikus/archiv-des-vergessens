use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CryptoError {
    #[error("Encryption failure: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failure: {0}")]
    DecryptionFailed(String),
    #[error("Invalid key length or format")]
    InvalidKey,
    #[error("Argon2 hashing error: {0}")]
    HashError(String),
}

pub struct CryptoService;

impl CryptoService {
    /// Normalizes any key string into a 32-byte key for AES-256.
    fn prepare_aes_key(key: &str) -> [u8; 32] {
        if let Ok(bytes) = hex::decode(key) {
            if bytes.len() == 32 {
                let mut k = [0u8; 32];
                k.copy_from_slice(&bytes);
                return k;
            }
        }
        let hash = Sha256::digest(key.as_bytes());
        let mut k = [0u8; 32];
        k.copy_from_slice(&hash);
        k
    }

    /// Encrypts plaintext data using AES-256-GCM.
    /// Returns a Base64-encoded string containing the 12-byte nonce prepended to the ciphertext.
    pub fn encrypt_aes_256_gcm(plaintext: &[u8], key: &str) -> Result<String, CryptoError> {
        let key_bytes = Self::prepare_aes_key(key);
        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

        let mut payload = Vec::with_capacity(12 + ciphertext.len());
        payload.extend_from_slice(&nonce_bytes);
        payload.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(payload))
    }

    /// Decrypts a Base64-encoded AES-256-GCM payload.
    pub fn decrypt_aes_256_gcm(encoded_payload: &str, key: &str) -> Result<Vec<u8>, CryptoError> {
        let payload = BASE64
            .decode(encoded_payload)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

        if payload.len() < 12 {
            return Err(CryptoError::DecryptionFailed(
                "Payload too short to contain nonce".into(),
            ));
        }

        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let key_bytes = Self::prepare_aes_key(key);
        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;
        let nonce = Nonce::from_slice(nonce_bytes);

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
    }

    /// Hashes a user password using Argon2id with a secure random salt.
    pub fn hash_password_argon2(password: &str) -> Result<String, CryptoError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| CryptoError::HashError(e.to_string()))?;

        Ok(password_hash.to_string())
    }

    /// Verifies a user password against an Argon2id formatted password hash string.
    pub fn verify_password_argon2(
        password: &str,
        password_hash_str: &str,
    ) -> Result<bool, CryptoError> {
        let parsed_hash = PasswordHash::new(password_hash_str)
            .map_err(|e| CryptoError::HashError(e.to_string()))?;
        let argon2 = Argon2::default();

        Ok(argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }
}

mod hex {
    pub fn decode(hex: &str) -> Result<Vec<u8>, ()> {
        if !hex.len().is_multiple_of(2) {
            return Err(());
        }
        (0..hex.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|_| ()))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aes_256_gcm_encrypt_decrypt_roundtrip() {
        let key = "secure_encryption_key_32_bytes_long_1234567890";
        let secret_message = b"Top Secret Mneme Data for Archiv des Vergessens!";

        let encrypted = CryptoService::encrypt_aes_256_gcm(secret_message, key)
            .expect("Encryption should succeed");
        assert_ne!(encrypted, String::from_utf8_lossy(secret_message));

        let decrypted =
            CryptoService::decrypt_aes_256_gcm(&encrypted, key).expect("Decryption should succeed");
        assert_eq!(decrypted, secret_message);
    }

    #[test]
    fn test_aes_decryption_with_wrong_key_fails() {
        let key = "correct_key_12345678901234567890";
        let wrong_key = "wrong_key_1234567890123456789012";
        let secret_message = b"Secret payload";

        let encrypted = CryptoService::encrypt_aes_256_gcm(secret_message, key).unwrap();
        let result = CryptoService::decrypt_aes_256_gcm(&encrypted, wrong_key);

        assert!(result.is_err());
    }

    #[test]
    fn test_argon2_hashing_and_verification() {
        let password = "SuperSecretPassword2026!";
        let hash =
            CryptoService::hash_password_argon2(password).expect("Argon2 hashing should succeed");

        assert!(hash.contains("$argon2id$"));

        let is_valid = CryptoService::verify_password_argon2(password, &hash)
            .expect("Verification should succeed");
        assert!(is_valid);

        let is_invalid = CryptoService::verify_password_argon2("WrongPassword!", &hash)
            .expect("Verification should succeed");
        assert!(!is_invalid);
    }
}
