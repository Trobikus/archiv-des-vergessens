use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("TOML serialization/deserialization error: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("TOML serialization error: {0}")]
    TomlSer(#[from] toml::ser::Error),
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub token_expiry_hours: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct CryptoConfig {
    pub encryption_key: String,
    pub salt: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct DatabaseConfig {
    pub path: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct AppConfig {
    pub auth: AuthConfig,
    pub crypto: CryptoConfig,
    pub database: DatabaseConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self::generate_default()
    }
}

impl AppConfig {
    /// Generates a new `AppConfig` filled with secure cryptographically random hex values.
    pub fn generate_default() -> Self {
        Self {
            auth: AuthConfig {
                jwt_secret: generate_random_hex(32),
                token_expiry_hours: 24,
            },
            crypto: CryptoConfig {
                encryption_key: generate_random_hex(32),
                salt: generate_random_hex(16),
            },
            database: DatabaseConfig {
                path: "data/app.db".to_string(),
                password: generate_random_hex(16),
            },
        }
    }

    /// Loads the configuration. If the config file does not exist, it is automatically
    /// created with secure random values before loading.
    pub fn load() -> Result<Self, ConfigError> {
        let config_path = env::var("CONFIG_PATH").unwrap_or_else(|_| "config.toml".to_string());
        Self::load_from_path(Path::new(&config_path))
    }

    /// Loads config from a specific path, auto-creating it with random secrets if missing,
    /// and applying environment variable overrides.
    pub fn load_from_path<P: AsRef<Path>>(path: P) -> Result<Self, ConfigError> {
        let path = path.as_ref();

        if !path.exists() {
            if let Some(parent) = path.parent() {
                if !parent.as_os_str().is_empty() {
                    fs::create_dir_all(parent)?;
                }
            }
            let default_config = Self::generate_default();
            let toml_str = toml::to_string_pretty(&default_config)?;
            fs::write(path, toml_str)?;
        }

        let content = fs::read_to_string(path)?;
        let mut config: AppConfig = toml::from_str(&content)?;

        // Apply environment variable overrides if present
        if let Ok(jwt_secret) = env::var("AUTH_JWT_SECRET") {
            if !jwt_secret.trim().is_empty() {
                config.auth.jwt_secret = jwt_secret;
            }
        }
        if let Ok(expiry_str) = env::var("AUTH_TOKEN_EXPIRY_HOURS") {
            if let Ok(expiry) = expiry_str.parse::<u64>() {
                config.auth.token_expiry_hours = expiry;
            }
        }
        if let Ok(enc_key) = env::var("CRYPTO_ENCRYPTION_KEY") {
            if !enc_key.trim().is_empty() {
                config.crypto.encryption_key = enc_key;
            }
        }
        if let Ok(salt) = env::var("CRYPTO_SALT") {
            if !salt.trim().is_empty() {
                config.crypto.salt = salt;
            }
        }
        if let Ok(db_path) = env::var("DATABASE_PATH") {
            if !db_path.trim().is_empty() {
                config.database.path = db_path;
            }
        }
        if let Ok(db_pass) = env::var("DATABASE_PASSWORD") {
            if !db_pass.trim().is_empty() {
                config.database.password = db_pass;
            }
        }

        Ok(config)
    }
}

/// Generates a cryptographically secure random hex string of specified byte length.
fn generate_random_hex(bytes_count: usize) -> String {
    let mut bytes = vec![0u8; bytes_count];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn test_auto_generate_config_on_first_start() {
        let _guard = ENV_LOCK.lock().unwrap();
        env::remove_var("AUTH_JWT_SECRET");
        env::remove_var("DATABASE_PASSWORD");

        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.toml");

        assert!(!path.exists());

        let config = AppConfig::load_from_path(&path).expect("Should auto-generate config");

        assert!(path.exists());
        assert!(!config.auth.jwt_secret.is_empty());
        assert_eq!(config.auth.jwt_secret.len(), 64); // 32 bytes hex = 64 chars
        assert_eq!(config.auth.token_expiry_hours, 24);
        assert!(!config.crypto.encryption_key.is_empty());
        assert_eq!(config.crypto.encryption_key.len(), 64);
        assert!(!config.crypto.salt.is_empty());
        assert_eq!(config.crypto.salt.len(), 32); // 16 bytes hex = 32 chars
        assert_eq!(config.database.path, "data/app.db");
        assert!(!config.database.password.is_empty());
    }

    #[test]
    fn test_env_var_override() {
        let _guard = ENV_LOCK.lock().unwrap();
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.toml");

        let initial_config = AppConfig::generate_default();
        let toml_str = toml::to_string_pretty(&initial_config).unwrap();
        fs::write(&path, toml_str).unwrap();

        env::set_var("AUTH_JWT_SECRET", "custom_override_jwt_secret_123");
        env::set_var("DATABASE_PASSWORD", "custom_db_password_456");

        let loaded = AppConfig::load_from_path(&path).unwrap();

        assert_eq!(loaded.auth.jwt_secret, "custom_override_jwt_secret_123");
        assert_eq!(loaded.database.password, "custom_db_password_456");

        env::remove_var("AUTH_JWT_SECRET");
        env::remove_var("DATABASE_PASSWORD");
    }
}
