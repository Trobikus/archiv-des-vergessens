use crate::db::DbManager;
use tempfile::TempDir;

/// Mock Context bundle for backend integration, database, and business logic testing.
pub struct MockTestContext {
    pub db: DbManager,
    pub temp_dir: TempDir,
}

impl MockTestContext {
    /// Creates a fully isolated test context with an in-memory database and temporary directory.
    pub fn new() -> Self {
        let db =
            DbManager::open_in_memory().expect("In-memory SQLite database initialization failed");
        let temp_dir =
            tempfile::tempdir().expect("Failed to create temporary directory for test isolation");

        MockTestContext { db, temp_dir }
    }
}

impl Default for MockTestContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Utility helper for mocking network responses or JSON state files
pub mod network_mock {
    pub fn mock_http_get_json(url: &str) -> Result<String, String> {
        if url.contains("github.com") {
            Ok(r#"{"tag_name": "v1.0.20", "name": "Release 1.0.20"}"#.to_string())
        } else {
            Err("Network unreachable in isolated mock mode".to_string())
        }
    }
}
