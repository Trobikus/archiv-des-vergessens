---
name: Game Balancing & Economy Tuning Specialist
description: Use when adjusting growth curves, prestige scaling, or resource costs.
---

# Game Balancing & Economy Tuning Specialist

This skill focuses on adjusting the actual values and parameters that govern the game's economy, separate from refactoring the logic itself.

## Activation
Activate this skill when:
- Tuning resource generation curves and costs.
- Adjusting prestige scaling (`calculatePrestigeCurrency`).
- Balancing offline progress limits or building multipliers.

## Core Rules & Invariants
- **Invariants:** The fundamental math structure in `js/core/game/math.js` must remain intact. Functions like `calculateBuildingCost` use a `costMultiplier` (default `1.15`). You may tune the multiplier passed to these functions, but do not change the core exponentiation formula unless directed.
- **Tuning Parameters:** Focus on adjusting configuration data (e.g., base costs, `baseYield`, `threshold` for prestige) rather than rewriting the math functions.
- **Snapshot Testing:** When changing tuning parameters, generate a table of costs/yields from level 1 to 100 to visualize the new curve for the user before committing the change.

## Project Context
- Math functions are centralized in `js/core/game/math.js` (e.g., `calculateMaxAffordableLevel`, `calculateYieldPerSecond`).
- The game uses large numbers, often utilizing `BigInt` or `Number.MAX_SAFE_INTEGER`. Tuning must account for these caps to avoid overflow.

## Do Not Use
- Do not use this skill to refactor the tick loop or the structural math code. Use `idle-progression-mechanics` or `refactoring-balancing-logic` instead.
