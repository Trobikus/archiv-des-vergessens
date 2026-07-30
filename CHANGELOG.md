# Changelog

Alle nennenswerten Änderungen an **Archiv des Vergessens** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.44] - 2026-07-30

### 🐛 Behoben – Auth, LocalStorage & Multiplayer-Verbindung
- **SecureStorage stabiler Key (`js/core/persistence/secure-storage.js`)**:
  - Verschlüsselungs-Seed hängt nicht mehr an `window.location.origin` und `navigator.userAgent` (Änderungen in Tauri/WebView invalidierten bisher Sessions nach Updates).
  - Fester Seed `archiv_des_vergessens_sec_v1_stable` für konsistente Entschlüsselung über Builds hinweg.
  - Bei fehlgeschlagener Entschlüsselung werden korrupte Einträge automatisch entfernt (kein Dauer-`null`).
  - Unicode-sicheres Base64-Encoding/Decoding; Hilfsmethode `clearAuthRelated()` für Notfall-Reset.
- **NetworkService User-ID & Handshake (`js/core/services/network-service.js`)**:
  - `archiv_user_id` über SecureStorage (konsistent mit AuthService und CloudManager).
  - Migration alter Klartext-`localStorage`-Einträge.
  - Guest-Handshake nutzt `AuthService.getCurrentUser().id` statt einer separaten Network-ID → verhindert User-ID-Mismatch beim Server-Auth-Paket.
- **Lore & Dialog-System Fix**:
  - Wiederherstellung der Pfad-Flags (`scholar_path`, `guardian_path`), Codex-Unlocks und visuellen Effekte in den Interaktiven Lore-Chroniken (`LORE_NODES`).
  - Behebung des fehlschlagenden CI-Tests `DialogAndChoiceSystem.test.js`.

---

## [1.0.43] - 2026-07-30

### 🛡️ Sicherheit & Architektur Refactoring
- **Sicherheit & Verschlüsselung**:
  - Härtung der Content Security Policy (CSP).
  - Verschlüsselung sensibler Daten im `localStorage` und Einführung einer Token-Rotation.
  - Behebung von CodeQL Alerts (z.B. Entfernung hartkodierter kryptografischer Werte).
- **Refactoring der Offline-Mechanik & Authentifizierung**:
  - Vollständige Entfernung des veralteten Offline-Account-Fallbacks inklusive Chat-Simulation.
  - Aufteilung der Authentifizierungs- und Datenverwaltungs-Logik in übersichtliche, separate Module.
- **CI/CD, Tooling & Repository Cleanup**:
  - Integration eines neuen CodeQL-Workflows für JS/TS und GitHub Actions.
  - Konsolidierung von `jsconfig` und `tsconfig`.
  - Verlagerung der Agent-Regeln in `.agents/skills` und Bereinigung von toten Dateien, ungenutzten Icons und temporären Tauri-Ordnern.
  - Ignorieren der RUSTSEC-2024-0429 Warnung in `audit.toml` für reibungslose Tauri-Builds.

---

## [1.0.42] - 2026-07-30

### 🚀 Navigation Refactoring & Legacy Cleanup
- **Rerouted Back Navigation from Hub (`js/controllers/navigation.js`, `js/controllers/settings-controller.js`)**:
  - `HUB_BACK_TO_MENU` and `showMenu()` now route directly to `showCharacterSelect()`, returning players to character selection rather than the obsolete single-player menu.
- **Legacy UI Removal & MainApp Integration (`js/ui/preact/views/MainApp.js`)**:
  - Removed deprecated `MenuView.js` component and redirected legacy `'menu'` view states to `CharacterSelectView`.
- **Test Coverage**:
  - Added NavigationController.test.js to verify navigation flow.

---

## [1.0.37] - 2026-07-26

### 🎨 Layout, Navigation & Network Enhancements
- **Multiplayer Network Service (`js/core/services/network-service.js`)**:
  - Optimierung der WebSocket-Verbindung, Reconnect-Backoff und Sync-Kanal-Stabilität.
- **Layout & Style Improvements (`css/layout.css`, `index.html`)**:
  - Feinabstimmung des UI-Grids und responsiven Layouts.
- **Navigation & IPC Resilience (`js/controllers/navigation.js`)**:
  - TypeScript-Typisierungs-Fix für `window.__TAURI__` IPC-Aufrufe.
- **Server Updates (`server/server.js`)**:
  - Absicherung der WebSocket-Server-Ratenbegrenzung und Payload-Verarbeitung.

---
