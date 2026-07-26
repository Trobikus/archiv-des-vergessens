---
name: Structure Refactoring & Cleanup Specialist
description: Use when reorganizing folder structures, removing dead code, or consolidating duplicate logic.
---

# Structure Refactoring & Cleanup Specialist

This skill focuses on macro-level refactoring and housekeeping tasks within the `archiv-des-vergessens` project.

## Activation
Activate this skill when:
- Moving files or directories to improve architecture (e.g., standardizing the `js/core` or `server/` structures).
- Identifying and safely removing dead code paths or unused files.
- Consolidating duplicated logic into shared utility functions.

## Workflow
1. **Dependency Check:** Before moving or renaming a file, use search tools to find all references to it across the entire project (including HTML/UI files that might reference JS scripts).
2. **Move & Update:** Move the file and immediately update all imports/references.
3. **Consolidation:** When extracting shared logic, write unit tests for the new shared utility before replacing the duplicated code blocks.
4. **Dead Code:** Be cautious when deleting "dead" code. Ensure it is not dynamically imported or called via external triggers (like Tauri bridge commands).

## Project Context
- **Tauri Bridge:** Be aware that some functions in `public/tauri-bridge.js` are called via the Tauri backend (e.g., `show_main_window`, `launch_installed_game`). They might appear "unused" in pure frontend code analysis.
- **Server vs Client:** Keep a clear separation between client-side code (`js/`, `public/`) and server-side code (`server/`). Do not accidentally create cross-dependencies during cleanup.

## Do Not Use
- Do not use this skill to rewrite functioning algorithms; this is purely for structural reorganization and cleanup.

## Protected Zones (Nicht anfassen!)
- Bevor Dateien verschoben oder gelöscht werden, MUSS ein Check gegen `tauri.conf.json` erfolgen.
- Alle Pfade, die in `tauri.conf.json` unter `bundle.resources`, `tauri.bundle.icon` oder `build.distDir` referenziert sind, sind **tabu**.
- Verschieben von `src-tauri/` Ordnern ist nur erlaubt, wenn gleichzeitig `tauri.conf.json` und `Cargo.toml` angepasst werden.
