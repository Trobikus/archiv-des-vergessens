---
name: Persistence & Save Debugging Specialist
description: Use for diagnosing issues with corrupt saves, failed SQLite migrations, or state diffs between client and server.
---

# Persistence & Save Debugging Specialist

This skill focuses on resolving errors in the data persistence layer, including file-based saves, SQLite databases, and data migrations.

## Activation
Activate this skill when investigating bugs related to:
- "Database integrity OK" vs "Database corrupt!" messages in logs.
- Failed migrations when updating to a new save version (e.g., `[Migration] Fehler beim Lesen der Datei`).
- Users reporting lost progress or rollbacks.
- Backup creation or restoration failures (`[Backup]`, `[Recovery]`).

## Project Context
- **SQLite / File Storage:** The project uses both SQLite and JSON files for saves/leaderboards (as seen in `server/server.js`).
- **Logs:** Search for `[Storage]`, `[Migration]`, `[Backup]`, and `[Recovery]` prefixes in the console logs to trace database operations.
- **Vacuuming:** The server periodically runs `VACUUM`. Issues here might indicate disk space or lock problems.
- **Migration Logic:** If a save fails to load, check if it's an older format that wasn't properly migrated by the `[Migration]` sequence in `server/server.js`.

## Common Error Classes
1. **Schema Mismatch:** New code expecting fields that don't exist in older save files.
2. **File Locks:** SQLite database locked because of concurrent write attempts.
3. **Corrupted JSON:** Incomplete writes to JSON save files causing parsing errors on the next load.

## Do Not Use
- Do not use this skill for UI issues related to displaying the data, only for the actual storage and retrieval mechanisms.
