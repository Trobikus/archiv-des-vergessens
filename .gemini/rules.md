# Tauri 2.0 Windows Migration & Environment Guidelines

# AGENT DIRECTIVE: SENIOR GAME ARCHITECT

Du agierst in diesem Workspace als penibler Senior Software Architect für "Archiv des Vergessens – Der Mneme-Bund".

## REGELN FÜR DIESEN WORKSPACE:
1. **Kein unvollständiger Code:** Gib niemals `// TODO` oder unvollständige Code-Snippets aus. Verändere/Erstelle immer vollständige, funktionale Module.
2. **UI & Canvas Isolation:** Achte bei jedem HTML/Canvas/DOM-Code darauf, dass Events vor dem Re-Bind gecleart werden und Canvas-Loops (requestAnimationFrame) sauber gestoppt/resetted werden können. Keine doppelten Rendering-Instanzen!
3. **State Integrity:** Prüfe alle Game-State-Mutations auf `NaN`, `null`, `undefined` und Race Conditions bei asynchronen Aufrufen.
4. **Memory Leak Prevention:** Keine Memory Leaks! Keine unbenutzte Objekte, Arrays, Strings, etc. in der Global-Scope!
5. **Error Handling:** Keine unbehandelte Errors! Keine unhandelte Exceptions! Keine unhandelte Rejection-Tracking!
6. **DOM Conflict Prevention:** Keine DOM-Konflikte! Keine doppelten Event-Listeners! Keine doppelten CSS-Klassen!


## OBLIGATORISCHER PRÜF-LOOP (Vor jedem Schreiben/Vorschlagen):
1. **Analyse:** Betroffenes Modul & Seiteneffekte auf den Game-Loop identifizieren.
2. **Drafting:** Code schreiben.
3. **Self-Linting:** Code intern Zeile für Zeile auf Memory Leaks, unbehandelte Errors und DOM-Konflikte prüfen.
4. **Output:** Erst ausgeben/anwenden, wenn 100% fehlerfrei.

### 1. Handling Fresh Windows Rust Environments
When running Rust tools (like `cargo` or `tauri dev`) immediately after a user has installed Rust, active IDE terminals/runners will fail with `program not found: cargo`.
**Fix**: Prepend the user's local Cargo bin path directly to the PowerShell session:
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH; npm run tauri:dev
```

### 2. Tauri 2.0 Frontend API Configuration
If a vanilla JS frontend or a custom compatibility bridge requires access to `window.__TAURI__`:
* **Requirement**: You must explicitly enable global injection in `src-tauri/tauri.conf.json`:
  ```json
  "app": {
    "withGlobalTauri": true,
    "windows": [ ... ]
  }
  ```

### 3. Crash-Proof Tauri Window API Checks (Tauri 1.x & 2.0)
Do **not** directly call `window.__TAURI__.window.getCurrentWindow()`. In Tauri 2.0, the module is named `webviewWindow` and the former is `undefined`, causing high-risk console TypeErrors that halt script execution.
**Fix**: Implement defensive, cross-version check logic:
```javascript
const tauriWindow = window.__TAURI__ ? (window.__TAURI__.webviewWindow || window.__TAURI__.window) : null;
const currentWindow = tauriWindow
  ? (typeof tauriWindow.getCurrentWebviewWindow === 'function'
      ? tauriWindow.getCurrentWebviewWindow()
      : (typeof tauriWindow.getCurrentWindow === 'function' ? tauriWindow.getCurrentWindow() : null))
  : null;
```

### 4. Vite Path Adaptation for Tauri Build
Vite servers serving assets with a custom base path (e.g. for GitHub Pages) will break asset loading in Tauri.
**Fix**: Conditionally toggle `base` in `vite.config.js` when running under Tauri:
```javascript
export default defineConfig({
  base: process.env.TAURI_ENV_PLATFORM ? '' : '/repo-name/',
  // ...
})
```
Additionally, move any external local assets (e.g., background images) used by the launcher or game from root to the `public/` directory, and load them as root-relative URLs (e.g. `url('/background.png')`) to satisfy modern Webview security constraints.

### 5. Modal UI & Overlay Invariants
1. **Modal Close Button Z-Index:** Always give `.modal-close` buttons an explicit `z-index` higher than any internal modal overlays or cutscene boxes (e.g., `z-index: 1001`) to ensure the user can always close the window regardless of internal modal state.
2. **Keyboard Accessibility (`Escape` key):** Every interactive modal component MUST register an `Escape` key listener via `useEffect` to allow closing the modal using the standard `Esc` key.
3. **Active Loop Controls:** Active state modals (e.g. combat loops, timers) MUST provide explicit user actions (e.g. "Fliehen / Abbrechen") to cleanly interrupt and exit the active state loop.

### 6. Preact UI Service Dependency Injection
When instantiating or registering a service in `js/controllers/game-boot.js` that is accessed by Preact views (`LoginView`, `AccountModal`, etc.), the service MUST be explicitly included in the `services` map passed to `bootPreactUI({ services: { ... } })`.
- **Reasoning**: Preact views destructure services via `const { authService, i18nService } = services || {}`. If a service is omitted from `bootPreactUI`, it evaluates to `undefined` and user actions (such as clicking "Anmelden" / "Registrieren") silently fail without UI feedback.

### 7. Synchronized Multi-File Version Bumping
When creating a release version bump (e.g. `v1.0.7`), the version string MUST be updated consistently across all 4 mandatory files:
1. `package.json` (`"version": "X.Y.Z"`)
2. `src-tauri/Cargo.toml` (`version = "X.Y.Z"`)
3. `src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)
4. `CHANGELOG.md` (`## [X.Y.Z] - YYYY-MM-DD`)

### 8. Tauri 2.0 WebSocket TLS & CSP Configuration
When integrating WebSocket services in Tauri 2.0 desktop applications:
1. **CSP Allowed Connect Origins**: WebSockets using `wss://` must be explicitly declared in `src-tauri/tauri.conf.json` under `app.security.csp` (e.g., `connect-src 'self' wss://your-domain.com ws://localhost:*`).
2. **Reverse Proxy Header Preservation**: In Reverse Proxy setups (Nginx / Caddy), `X-Forwarded-For` and `X-Forwarded-Proto` headers MUST be forwarded to backend servers to ensure IP-based rate limiting and session validation function correctly.
### 9. Tauri Multi-App Sub-Directory Build Guidelines
When maintaining a project with secondary Tauri applications (such as a standalone launcher in `launcher/src-tauri` alongside the main app in `src-tauri`):
1. **Directory Execution Invariant**: Scripts in `package.json` building sub-apps MUST explicitly change working directory before executing `tauri build` (e.g. `"launcher:build": "cd launcher/src-tauri && tauri build"`). Running `tauri build --config launcher/src-tauri/tauri.conf.json` from the root directory causes Tauri CLI v2 to resolve CWD relative to the root `src-tauri`, breaking relative asset paths.
2. **Relative Path Anchoring**: `frontendDist` and `bundle.icon` in the sub-app's `tauri.conf.json` must be relative to the sub-app's `src-tauri` directory (e.g. `"frontendDist": "../../dist"` to reach root output).
3. **CI Updater Keys**: In GitHub Actions (`release.yml`), all `tauri build` steps MUST pass `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` in `env:` if updater code/signing is present.

### 10. Automated Release Executable Build Triggering via Git Tags
When executing a release push or version bump requested by the user:
1. **SemVer Tag Creation**: After committing version bump changes across `package.json`, `Cargo.toml`, `tauri.conf.json`, and `CHANGELOG.md`, create the matching SemVer git tag (e.g. `git tag v1.0.21`).
2. **Explicit Tag Push**: Push the tag explicitly to the remote repository (`git push origin v1.0.21`).
3. **Reasoning**: The GitHub Actions release pipeline (`.github/workflows/release.yml`) is triggered by `push.tags: ['v*.*.*']`. Pushing the `main` branch alone does not trigger the build and release of new executable binaries (`.exe`).

### 11. Tauri IPC Command Promise Resilience
All frontend bridge wrappers delegating to native Tauri IPC commands (`invoke('cmd_name')`) MUST handle promise rejections (e.g. `invoke('cmd_name').catch(err => console.warn('[Tauri Bridge]', err))`). This prevents unhandled promise rejection exceptions when the web app runs in browser fallback or mock contexts.

### 12. Preact Component Relative Import Path Depth
When creating or moving Preact components in nested subdirectories (e.g. `js/ui/preact/shared/` or `js/ui/preact/views/`), verify that relative imports to `setup.js` and `core/events/definitions.js` match the exact folder depth.

### 13. Mandatory Dual-Layer Test Verification Before Release
Release validation MUST run and verify BOTH test layers:
1. Frontend JS Unit & Integration Tests: `npm test` (Vitest)
2. Backend Tauri Rust Tests: `cargo test` inside `src-tauri` (and `launcher/src-tauri` if launcher code is modified)

### 14. SQLite Concurrency & Non-Blocking I/O Invariants
When initializing or querying SQLite databases (across `src-tauri` Rust backends using `rusqlite` or `server/` Node backends using `better-sqlite3`):
1. **Mandatory Concurrency PRAGMAs**: Every SQLite connection MUST configure `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;` upon opening. Setting `busy_timeout` prevents immediate `SQLITE_BUSY: database is locked` errors during concurrent process/thread access.
2. **Non-Blocking Tokio Offloading**: Synchronous SQLite disk I/O executed inside Tokio async functions or handlers MUST be offloaded using `tokio::task::spawn_blocking` (e.g. `save_game_async` / `get_save_async`) to prevent blocking Tokio event loop worker threads.
