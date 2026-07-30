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

## Workflow & Guidelines
1. **Fresh Windows Rust Environment:** If running Rust tools immediately after installation, prepend Cargo bin path: `$env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH`.
2. **Versioning & Tagging:** Update versions consistently across 4 files: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `CHANGELOG.md`. Trigger builds by creating and pushing a SemVer tag (e.g. `git tag v1.0.21 && git push origin v1.0.21`).
3. **Multi-App Sub-Directory Builds:** Sub-app builds (e.g., launcher) MUST change working directory first (e.g., `"cd launcher/src-tauri && tauri build"`). Dist paths in `tauri.conf.json` must be relative to that directory (`"frontendDist": "../../dist"`).
4. **Vite Base Path:** Vite `base` setting in `vite.config.js` must handle Tauri vs Web: `base: process.env.TAURI_ENV_PLATFORM ? '' : '/repo-name/'`.
5. **Crash-Proof Tauri Window API:** Handle Tauri 2.0 vs 1.x defensively (`webviewWindow` vs `window` check) to avoid `TypeError` Halts.
6. **IPC Promise Resilience:** Handle IPC command rejections (`invoke('cmd').catch(...)`) for web/mock fallbacks.
7. **Capabilities & Whitelisting:** Tauri v2 uses capabilities (`src-tauri/capabilities/`). Verify new filesystem/network access is whitelisted.
8. **Dual-Layer Verification:** Validate releases with both `npm test` (Vitest) and `cargo test` (in `src-tauri` / `launcher/src-tauri`).

## Do Not Use
- Do not use this skill for frontend UI bugs or server logic. This is strictly for the deployment and build pipeline.

