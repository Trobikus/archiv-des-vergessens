---
name: Build & Release Specialist (Tauri)
description: Use when configuring the cross-platform build process, auto-updater, or versioning for the Tauri app.
---

# Build & Release Specialist (Tauri)

This skill manages the build pipeline, release artifacts, and versioning for "Archiv des Vergessens" using Tauri and Vite.

## Activation
Activate this skill when:
- Updating `tauri.conf.json` build settings.
- Configuring the `@tauri-apps/plugin-updater`.
- Troubleshooting cross-platform build issues (Windows/Mac/Linux).
- Managing package versions in `package.json` and `Cargo.toml`.

## Project Context
- **Stack:** The project uses Vite + Preact for the frontend and Tauri (Rust) for the backend wrapper.
- **Build Scripts:** `package.json` contains `npm run tauri:build` and `npm run launcher:build` (which builds the launcher via Cargo).
- **Updater:** The project uses `@tauri-apps/plugin-updater`. Any updater config changes must happen in `tauri.conf.json` under plugins.

## Workflow
1. **Versioning:** Ensure versions are bumped consistently across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
2. **Icons:** Tauri requires a specific icon format and structure in `src-tauri/icons/`. Do not modify these unless using the Tauri icon generation tool.
3. **Capabilities:** Tauri v2 uses capabilities (`src-tauri/capabilities/`). Verify that any new filesystem or network access requirements are whitelisted here before building.

## Do Not Use
- Do not use this skill for frontend UI bugs or server logic. This is strictly for the deployment and build pipeline.
