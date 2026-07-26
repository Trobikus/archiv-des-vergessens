---
name: Content Pipeline Specialist
description: Use when adding or modifying game content entities like items, bosses, or quests.
---

# Content Pipeline Specialist

This skill focuses on the systematic creation, modification, and validation of game content definitions (e.g., items, enemies, quests).

## Activation
Activate this skill when:
- Creating new items, bosses, or lore nodes.
- Updating existing data tables in `js/data/`.
- Ensuring new content conforms to existing schemas.

## Workflow
1. **Locate Data Source:** Identify the relevant file in `js/data/` (e.g., `items.js`, `bosses.js`, `quests.js`).
2. **Schema Analysis:** Observe the structure of existing entries in the file. Which fields are mandatory? Which are optional? What are the standard ID naming conventions (e.g., `item_sword_01`)?
3. **Draft Content:** Create the new entries following the established schema.
4. **Validation:** Before finalizing, double-check that you haven't introduced syntax errors or broken references (e.g., a quest referencing a non-existent item ID).

## Project Context
- All static game content is defined in pure JavaScript files inside `js/data/`.
- IDs must be unique across the respective domain.
- When creating content that uses localized strings, consider if there is a localization pipeline or if text is hardcoded in the data file.

## Do Not Use
- Do not use this skill to write dynamic logic for how items are used in combat or how quests are resolved. This is strictly for the *data definition* pipeline.
