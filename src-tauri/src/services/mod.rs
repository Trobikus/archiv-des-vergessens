// ============================================================
// DEPRECATED: Unused legacy offline infrastructure
// ============================================================
#[deprecated(note = "DEPRECATED: Unused legacy offline infrastructure")]
pub mod auth;

#[deprecated(note = "DEPRECATED: Unused legacy offline infrastructure")]
pub mod crypto;

pub mod game_loop;

#[allow(deprecated)]
pub use auth::*;
#[allow(deprecated)]
pub use crypto::*;
pub mod game_loop_service {
    pub use super::game_loop::*;
}
