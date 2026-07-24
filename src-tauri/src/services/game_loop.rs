use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GameState {
    pub mneme_points: u64,
    pub base_generation_rate: u64,
    pub multiplier: f64,
    pub play_time_seconds: u64,
    pub last_tick_timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OfflineTickResult {
    pub elapsed_seconds: u64,
    pub mneme_earned: u64,
    pub new_total_mneme: u64,
    pub capped: bool,
}

pub struct GameLoopService;

impl GameLoopService {
    /// Maximum offline progress cap in seconds (24 hours = 86400s)
    pub const MAX_OFFLINE_SECONDS: u64 = 86_400;

    /// Calculates a single active game loop tick resource gain.
    pub fn process_tick(state: &mut GameState, delta_seconds: u64) {
        let earned =
            ((state.base_generation_rate as f64) * state.multiplier * (delta_seconds as f64))
                .round() as u64;
        state.mneme_points = state.mneme_points.saturating_add(earned);
        state.play_time_seconds = state.play_time_seconds.saturating_add(delta_seconds);
    }

    /// Calculates offline gains given a last offline timestamp and current timestamp.
    pub fn calculate_offline_progress(
        state: &GameState,
        current_time_sec: u64,
    ) -> OfflineTickResult {
        if current_time_sec <= state.last_tick_timestamp {
            return OfflineTickResult {
                elapsed_seconds: 0,
                mneme_earned: 0,
                new_total_mneme: state.mneme_points,
                capped: false,
            };
        }

        let raw_elapsed = current_time_sec - state.last_tick_timestamp;
        let (elapsed, capped) = if raw_elapsed > Self::MAX_OFFLINE_SECONDS {
            (Self::MAX_OFFLINE_SECONDS, true)
        } else {
            (raw_elapsed, false)
        };

        // Offline efficiency factor: 75% rate for offline time
        let offline_multiplier = 0.75;
        let earned = ((state.base_generation_rate as f64)
            * state.multiplier
            * offline_multiplier
            * (elapsed as f64))
            .round() as u64;

        OfflineTickResult {
            elapsed_seconds: elapsed,
            mneme_earned: earned,
            new_total_mneme: state.mneme_points.saturating_add(earned),
            capped,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_tick_accumulation() {
        let mut state = GameState {
            mneme_points: 100,
            base_generation_rate: 10,
            multiplier: 2.0,
            play_time_seconds: 50,
            last_tick_timestamp: 1000,
        };

        GameLoopService::process_tick(&mut state, 5); // 10 * 2.0 * 5 = 100 earned

        assert_eq!(state.mneme_points, 200);
        assert_eq!(state.play_time_seconds, 55);
    }

    #[test]
    fn test_offline_progress_cap_at_24_hours() {
        let state = GameState {
            mneme_points: 1000,
            base_generation_rate: 100,
            multiplier: 1.0,
            play_time_seconds: 3600,
            last_tick_timestamp: 10_000,
        };

        // 48 hours offline
        let current_time = 10_000 + 172_800;
        let result = GameLoopService::calculate_offline_progress(&state, current_time);

        assert!(result.capped);
        assert_eq!(result.elapsed_seconds, 86_400); // capped at 24 hours
        assert_eq!(result.mneme_earned, (100.0 * 1.0 * 0.75 * 86400.0) as u64); // 6,480,000
    }
}
