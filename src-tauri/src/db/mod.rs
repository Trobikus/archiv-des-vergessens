use crate::config::DatabaseConfig;
use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database connection failed: {0}")]
    ConnectionError(#[from] rusqlite::Error),
    #[error("Savegame error: {0}")]
    SaveError(String),
    #[error("User not found: {0}")]
    UserNotFound(String),
    #[error("IO error during DB initialization: {0}")]
    IoError(#[from] std::io::Error),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct GameSave {
    pub id: i64,
    pub player_name: String,
    pub mneme_points: u64,
    pub play_time_seconds: u64,
    pub last_updated: i64,
}

#[derive(Clone)]
pub struct DbManager {
    conn: Arc<Mutex<Connection>>,
}

impl DbManager {
    /// Initializes an in-memory database instance for testing with complete isolation.
    pub fn open_in_memory() -> Result<Self, DbError> {
        let conn = Connection::open_in_memory()?;
        let _ = conn.pragma_update(None, "busy_timeout", "5000");
        let _ = conn.pragma_update(None, "foreign_keys", "ON");
        let manager = DbManager {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.init_schema()?;
        Ok(manager)
    }

    /// Opens or creates a file-backed SQLite database at the specified path.
    pub fn open_at_path(path: &str) -> Result<Self, DbError> {
        let password = std::env::var("MNEME_DB_PASSWORD").unwrap_or_default();
        Self::open_at_path_with_password(path, &password)
    }

    /// Opens or creates a file-backed SQLite database using `DatabaseConfig`.
    pub fn open_with_config(config: &DatabaseConfig) -> Result<Self, DbError> {
        Self::open_at_path_with_password(&config.path, &config.password)
    }

    /// Opens database with encryption key / password (PRAGMA key).
    pub fn open_at_path_with_password(path: &str, password: &str) -> Result<Self, DbError> {
        if let Some(parent) = Path::new(path).parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }

        let conn = Connection::open(path)?;

        // Enable WAL mode, busy_timeout, and synchronous NORMAL for concurrency & locking protection
        let _ = conn.pragma_update(None, "journal_mode", "WAL");
        let _ = conn.pragma_update(None, "busy_timeout", "5000");
        let _ = conn.pragma_update(None, "synchronous", "NORMAL");
        let _ = conn.pragma_update(None, "foreign_keys", "ON");

        if !password.is_empty() {
            // Apply key for SQLCipher / SQLite encryption if supported
            let _ = conn.pragma_update(None, "key", password);
        }

        let manager = DbManager {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.init_schema()?;
        Ok(manager)
    }

    /// Initializes schema tables required by the game.
    pub fn init_schema(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS game_saves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                mneme_points INTEGER NOT NULL DEFAULT 0,
                play_time_seconds INTEGER NOT NULL DEFAULT 0,
                last_updated INTEGER NOT NULL
            );",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );",
            [],
        )?;
        Ok(())
    }

    /// Saves or updates player game progress.
    pub fn save_game(
        &self,
        player_name: &str,
        mneme_points: u64,
        play_time: u64,
    ) -> Result<i64, DbError> {
        let conn = self.conn.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO game_saves (player_name, mneme_points, play_time_seconds, last_updated)
             VALUES (?1, ?2, ?3, ?4);",
            params![player_name, mneme_points, play_time, now],
        )?;

        let last_id = conn.last_insert_rowid();
        Ok(last_id)
    }

    /// Retrieves game save by player name.
    pub fn get_save(&self, player_name: &str) -> Result<Option<GameSave>, DbError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, player_name, mneme_points, play_time_seconds, last_updated
             FROM game_saves WHERE player_name = ?1 ORDER BY id DESC LIMIT 1;",
        )?;

        let mut rows = stmt.query(params![player_name])?;
        if let Some(row) = rows.next()? {
            Ok(Some(GameSave {
                id: row.get(0)?,
                player_name: row.get(1)?,
                mneme_points: row.get(2)?,
                play_time_seconds: row.get(3)?,
                last_updated: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Asynchronously saves player game progress using `tokio::task::spawn_blocking` to avoid blocking Tokio worker threads.
    pub async fn save_game_async(
        &self,
        player_name: String,
        mneme_points: u64,
        play_time: u64,
    ) -> Result<i64, DbError> {
        let db = self.clone();
        tokio::task::spawn_blocking(move || db.save_game(&player_name, mneme_points, play_time))
            .await
            .map_err(|e| DbError::SaveError(format!("Task spawn error: {e}")))?
    }

    /// Asynchronously retrieves game save by player name using `tokio::task::spawn_blocking`.
    pub async fn get_save_async(&self, player_name: String) -> Result<Option<GameSave>, DbError> {
        let db = self.clone();
        tokio::task::spawn_blocking(move || db.get_save(&player_name))
            .await
            .map_err(|e| DbError::SaveError(format!("Task spawn error: {e}")))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_db_in_memory_initialization() {
        let db = DbManager::open_in_memory().expect("In-memory DB should initialize");
        let save = db.get_save("TestHero").expect("Query should succeed");
        assert!(save.is_none());
    }

    #[test]
    fn test_db_save_and_retrieve_game() {
        let db = DbManager::open_in_memory().expect("DB init failed");
        let save_id = db
            .save_game("GrimoireHero", 5000, 1200)
            .expect("Save should succeed");
        assert!(save_id > 0);

        let retrieved = db.get_save("GrimoireHero").expect("Query failed").unwrap();
        assert_eq!(retrieved.player_name, "GrimoireHero");
        assert_eq!(retrieved.mneme_points, 5000);
        assert_eq!(retrieved.play_time_seconds, 1200);
    }

    #[test]
    fn test_db_with_encrypted_config() {
        let temp_file = NamedTempFile::new().unwrap();
        let config = DatabaseConfig {
            path: temp_file.path().to_str().unwrap().to_string(),
            password: crate::config::AppConfig::generate_default()
                .database
                .password,
        };

        let db = DbManager::open_with_config(&config).expect("Encrypted DB should open");
        db.save_game("EncryptedPlayer", 1000, 60).unwrap();

        let save = db.get_save("EncryptedPlayer").unwrap().unwrap();
        assert_eq!(save.player_name, "EncryptedPlayer");
    }

    #[tokio::test]
    async fn test_db_wal_mode_and_async_save_load() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path().to_str().unwrap().to_string();

        let db = DbManager::open_at_path(&path).expect("File DB should open");

        // Verify journal_mode is WAL
        {
            let conn = db.conn.lock().unwrap();
            let journal_mode: String = conn
                .query_row("PRAGMA journal_mode;", [], |r| r.get(0))
                .unwrap();
            assert_eq!(journal_mode.to_uppercase(), "WAL");
        }

        // Test async save and load roundtrip
        let save_id = db
            .save_game_async("AsyncHero".to_string(), 12345, 999)
            .await
            .expect("Async save should succeed");
        assert!(save_id > 0);

        let retrieved = db
            .get_save_async("AsyncHero".to_string())
            .await
            .expect("Async load should succeed")
            .unwrap();

        assert_eq!(retrieved.player_name, "AsyncHero");
        assert_eq!(retrieved.mneme_points, 12345);
        assert_eq!(retrieved.play_time_seconds, 999);
    }
}
