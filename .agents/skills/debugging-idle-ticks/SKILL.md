---
name: Idle & Tick Debugging Specialist
description: Use for diagnosing issues with offline progression, time skips, big number calculation errors, or state inconsistencies during ticks.
---

# Idle & Tick Debugging Specialist

This skill focuses on resolving errors in the core loop of the game, including tick calculations and offline progression formulas.

## Activation
Activate this skill when investigating bugs related to:
- Offline progress yielding incorrect amounts (too much or too little).
- UI values not updating correctly after a tick.
- `NaN` or Infinity errors when dealing with large numbers (e.g., using `BigInt` or similar libraries).
- Inconsistencies between client-side predicted state and server-side validated state.

## Project Context
- **Large Numbers:** Ensure all calculations use the project's big number utilities to prevent precision loss or overflow.
- **Tick Logs:** Look for logs like `[Test] Slow tick processing for X members took Yms`.
- **Reproducing Offline Progress:** To test offline progress, temporarily mock the `Date.now()` or the `lastSaveTime` to simulate a large time gap without waiting.

## Common Error Classes
1. **Rounding/Truncation:** Mixing `Number` and `BigInt` or failing to round after division.
2. **Double Ticks:** A tick being processed twice because of race conditions between the client loop and server responses.
3. **Delta Time Bugs:** Assuming a fixed tick length instead of using the actual time delta `dt`.

## Do Not Use
- Do not use this skill to *change* the balancing values. This is strictly for fixing bugs in the calculation *logic*.
