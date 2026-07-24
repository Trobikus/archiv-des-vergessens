# Tauri 2.0 Windows Migration & Environment Guidelines

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

