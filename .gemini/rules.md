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
