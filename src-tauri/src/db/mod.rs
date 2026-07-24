use rusqlite::{params, Connection, Result};
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
        let manager = DbManager {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.init_schema()?;
        Ok(manager)
    }

    /// Opens or creates a file-backed SQLite database at the specified path.
    pub fn open_at_path(path: &str) -> Result<Self, DbError> {
        let conn = Connection::open(path)?;
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
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
