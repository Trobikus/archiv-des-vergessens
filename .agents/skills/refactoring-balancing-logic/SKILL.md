---
name: Balancing Logic Refactoring Specialist
description: Use when refactoring the math, formulas, or logic that drive game balancing and resource generation.
---

# Balancing Logic Refactoring Specialist

This skill focuses on safely restructuring code that calculates game balancing values (e.g., resource yields, upgrade costs, tick deltas) without altering the actual numbers or progression speed.

## Activation
Activate this skill when refactoring:
- Formulas for resource generation.
- Logic calculating idle/offline progress.
- Price scaling or cost formulas.

## Workflow & Snapshotting
1. **Never Change Values:** Do not adjust the baseline numbers "while you're at it". If a formula needs refactoring for clarity, the mathematical output must remain identical.
2. **Snapshot Testing:** Before modifying a formula, write a quick test script that calculates the output for a range of inputs (e.g., levels 1 to 100) and saves it as a "snapshot" or console logs it.
3. **Refactor:** Apply the structural changes to the code.
4. **Compare:** Run the same test script and ensure the output matches the snapshot exactly.

## Project Context
- **Large Numbers:** Ensure `BigInt` or similar big number implementations are preserved during refactoring. Changing the data type can lead to subtle overflow or precision bugs.
- **Tick Engine:** When refactoring the tick loop, verify that `dt` (delta time) is applied identically before and after.

## Do Not Use
- Do not use this skill to perform actual rebalancing (changing the game's difficulty or speed). Rebalancing is a feature change, not a refactoring task.
