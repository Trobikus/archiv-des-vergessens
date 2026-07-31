# Changelog

Alle nennenswerten Änderungen an **Archiv des Vergessens** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.45] - 2026-07-31

### 🎬 Story & Cinematic Overhaul
- **HubView Modularisierung & Refactoring**: HubView in dedizierte Kategorien-Komponenten aufgeteilt (`HubCategoryCore`, `HubCategoryCrafting`, `HubCategoryCollection`, `HubCategorySocial`, `HubCategorySettings`, `HubHeader`, `HubNavigation`, `HubWikiModal`).
- **Cinematic Event & Story System**: Integrierung des Cinematic-Asset-Katalogs, Staggered Cutscene Animationen, Partikeleffekte und entkoppeltes Story & Dialog UI (`StoryBranchUI`, `DialogUI`).

## [1.0.42] - 2026-07-30

### 🚀 Navigation Refactoring & Legacy Cleanup
- **Rerouted Back Navigation from Hub (`js/controllers/navigation.js`, `js/controllers/settings-controller.js`)**:
  - `HUB_BACK_TO_MENU` and `showMenu()` now route directly to `showCharacterSelect()`, returning players to character selection rather than the obsolete single-player menu.
- **Legacy UI Removal & MainApp Integration (`js/ui/preact/views/MainApp.js`)**:
  - Removed deprecated `MenuView.js` component and redirected legacy `'menu'` view states to `CharacterSelectView`.
- **Test Coverage**:
  - Added [NavigationController.test.js](file:///c:/Users/hoffm/Desktop/Max_KI_Projekte/archiv-des-vergessens/js/_tests_/NavigationController.test.js) to verify navigation flow.

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

## [1.0.36] - 2026-07-26

### 🛠️ Architecture & Settings Controller Refactoring
- **Settings Controller Extraction (`js/controllers/settings.js`)**:
  - Trennung von Einstellungen und Navigation: Extraktion von `SettingsController` aus dem `NavigationController`.
  - Saubere Injektion und DI-Entkopplung aller Einstellungsoptionen und SSOT-State-Updates.
- **Dependency Cleanup & Test Coverage**:
  - 20 Unit- & Integrationstest-Suites im Frontend (135 Tests) und alle Rust-Integrationstests vollständig verifiziert.

---

## [1.0.35] - 2026-07-25

### 🔐 Vault Concurrency & Global Tauri Integration
- **Account Vault Queueing (`js/core/persistence/save-manager.js`)**:
  - Implementierung von `_vaultSaveLock` und `_vaultSaveQueue` zur Absicherung paralleler Schreibzugriffe auf das Account-Lager.
- **BigInt Serialisierungs-Schutz (`js/core/persistence/save-manager.js`)**:
  - Sicheres Klonen und Konvertieren von BigInt-Werten in `cleanState` vor der IndexedDB-Persistierung.
- **Global Tauri API Access (`src-tauri/tauri.conf.json`)**:
  - Re-Aktivierung von `"withGlobalTauri": true` zur Unterstützung direkter globaler `window.__TAURI__`-Zugriffe.

---

## [1.0.34] - 2026-07-25

### 🌌 Story System & Visual Polish
- **Ewige Mneme Sequenz (`js/ui/preact/shared/EwigeMnemeSequence.js`)**:
  - Neue visuelle Story-Sequenz für Meilensteine und Mneme-Momente implementiert.
- **Feature Unlock Toast (`js/ui/preact/shared/FeatureUnlockToast.js`)**:
  - Benachrichtigungssystem für freigeschaltete Spielmechaniken und Features.
- **Atmosphärische visuelle Effekte (`css/story-events.css`, `js/ui/dom/particles.js`, `click-burst.js`)**:
  - Partikel- und Klick-Effekte für immersivere Story-Interaktionen optimiert.
- **StoryService & State Selectors Update (`js/core/services/story-service.js`, `selectors.js`)**:
  - Erweiterung der Story-Event-Trigger und Fortschritts-Prüfungen.

---

## [1.0.33] - 2026-07-25

### 🛠️ Persistence & IPC Reliability
- **SaveManager & IndexedDB Update (`js/core/persistence/save-manager.js`)**:
  - Direkter Zugriff auf `request.result` bei DB-Lifecycle-Events (`onupgradeneeded`, `onblocked`, `onsuccess`).
  - `loadAccountVault(userId)` nutzt nun die korrekte `_getVaultKey(userId)`-Methode zur benutzerspezifischen Vault-Zuordnung.
- **Tauri Bridge & IPC Robustheit (`public/tauri-bridge.js`, `src-tauri/`)**:
  - Abgefangenes Handling unbehandelter Promise-Rejections bei nativen IPC-Aufrufen (`quit_app`, `show_main_window`, `close_launcher`).
  - Wiederherstellung und Validierung des `open_release_page`-Befehls mit striktem URL-Check im Rust Backend.
- **Preact Modale & UI-Import-Fixes**:
  - Korrigierte relative Importpfade für Preact-Komponenten und Modale (`OfflineProgressModal`, `UpdateModal`, `IntroView`, `MainApp`).

---

## [1.0.32] - 2026-07-25

### ⚡ Refactoring & Stabilization
- **Vollständige Entfernung der veralteten Offline-Auth-Infrastruktur (`src-tauri/`)**:
  - `AuthService.rs` und `CryptoService.rs` sowie ungenutzte Krypto-Abhängigkeiten (`argon2`, `jsonwebtoken`) vollständig aus dem Rust-Backend entfernt.
- **Robustes Persistence & Queue Refactoring (`js/core/persistence/save-manager.js`)**:
  - Behebung von Race-Conditions und Verriegelungsfehlern (`_saveLock`/`_loadLock`) im IndexedDB SaveManager.
  - Gast-Account Sicherheitsprüfung korrigiert, um ungewolltes Überschreiben von Daten zu verhindern.
- **DI Container & Architecture SSOT (`js/core/di/`)**:
  - Zentralisierung der Service-Injektion und Einstellungen (SSOT) via `DIContainer`.
- **100% Test-Grün**:
  - 116 Vitest Frontend-Tests (17 Test-Suites) und sämtliche Rust-Integrationstests erfolgreich bestanden.

---

## [1.0.31] - 2026-07-25

### 🔐 Cryptographic Release Signature & Ed25519 Launcher Verification
- **Automatisierte Ed25519 Release-Signierung (`.github/workflows/release.yml`, `scripts/`)**:
  - CI-Workflow signiert `archiv-des-vergessens.zip` automatisch mit privatem Schlüssel und lädt `archiv-des-vergessens.zip.sig` als Release-Asset hoch.
- **Launcher Signaturprüfung (`launcher/src-tauri/src/main.rs`)**:
  - Der Standalone-Launcher verifiziert vor dem Entpacken die Ed25519-Signatur des heruntergeladenen ZIP-Archivs gegen den eingebetteten Public Key. Abbruch bei Manipulationsverdacht.
- **Server IP-Schutz & E-Mail-Validierung (`server/server.js`)**:
  - Konfigurierbarer `TRUST_PROXY` Support gegen IP-Spoofing.
  - Korrigierte Reihenfolge von E-Mail-Formatvalidierung und Sanitization beim Registrieren.

---

## [1.0.30] - 2026-07-25

### ⚔️ Combat Events, Custom Icons & Production Logging Cleanup
- **Combat Events & Feedback (`story-service.js`, `definitions.js`)**:
  - Hinzufügen von `COMBAT_TICK`-Events für Kampfzauber und Physische Angriffe zur verbesserten UI-Rückmeldung.
- **Dynamic Hero Item Icons (`HeroUI.js`)**:
  - Dynamisches Fallback-Icon-Mapping basierend auf Gegenstandsnamen und Slots (inkl. neuer Assets für Hammer, Schwert, Rüstung, Helm, Juwel).
- **Network Toast Feedback (`game-boot.js`)**:
  - Automatische Toast-Benachrichtigungen bei Verbindungstrennung (`network:disconnected`) und Wiederherstellung.
- **Production Build & Launcher Cleanup (`launcher.js`, `main.rs`)**:
  - Entfernung von Debug-Konsolenausgaben im Launcher für schlankere Production Builds.
  - Hinzufügen der CI/CD Build-Skripte (`game:build`, `launcher:build`) in `package.json`.
- **Pure Rust Crypto & CI Compatibility (`jsonwebtoken`)**:
  - Umstellung auf `rust_crypto` Provider zur plattformübergreifenden Absicherung in GitHub Actions.

---

## [1.0.29] - 2026-07-25

### 🚀 Opener Plugin Integration & Persistence Stability
- **Tauri Plugin Opener Integration (`src-tauri/`)**:
  - Integration von `tauri-plugin-opener` zur sicheren Handhabung externer URLs (`open_release_page`) mit strikter Validierung auf das offizielle Repository.
- **Speicher-Anomalien & Nebenläufigkeit (`SaveManager.js`)**:
  - Absicherung paralleler Speichervorgänge via `_pendingState` und `_pendingSlotId`, um Datenverlust bei schnellen aufeinanderfolgenden Saves zu verhindern.
- **Sanitizer & Math Hilfsfunktionen (`sanitizer.js` & `math.js`)**:
  - Absicherung von `sanitizeNumber` gegen `Infinity` / `-Infinity` Werte (`Number.isFinite`).
  - Anbindung von `calculateOfflineProgress` an die zentrale Maximalkonfiguration (`CONFIG.SYSTEM.MAX_OFFLINE_MS`).
- **Umfassende Verifikation**:
  - Erfolgreiche Durchführung aller 116 Frontend Unit-Tests, 27 Rust Integrationstests, TypeScript Typechecks und Produktions-Build.

---

## [1.0.28] - 2026-07-25

### 🔐 Server-Sicherheit, App Icons & Tauri CSP
- **Server-Sicherheits-Schutz**:
  - Hinzufügen von Payload-Limit (300 KB) bei Cloud-Saves und Plausibilitätsprüfungen für Leaderboard-Einträge in `server/server.js`.
- **Tauri Sicherheits-Konfiguration & Icon Assets**:
  - Verschärfung der Content Security Policy (CSP) in `src-tauri/tauri.conf.json`.
  - Aktualisierung und Bereitstellung aller App-Icons für Windows, Android und Web in `src-tauri/icons/` und `public/icons/`.
- **Rust Backend Optimierung**:
  - Säuberung ungenutzter Tauri IPC Commands in `src-tauri/src/commands/mod.rs` & Entkopplung aus `src-tauri/src/lib.rs`.
- **Verifikation & Testabdeckung**:
  - Alle 26 Rust Backend Tests und 115 Frontend Unit-Tests bestanden.

---

## [1.0.27] - 2026-07-25

### ⚙️ Tauri Capabilities & Frontend Plugin-Dependencies Update
- **Tauri Plugin Permissions & Capabilities (`src-tauri/capabilities/default.json`)**:
  - Aktualisierung der Plugin-Berechtigungen auf `updater:default` und `process:allow-restart`.
- **Frontend Dependencies & Tauri Scripts (`package.json`)**:
  - Ergänzung von `@tauri-apps/api`, `@tauri-apps/plugin-process` und `@tauri-apps/plugin-updater` unter `dependencies`.
  - Hinzufügen von Hilfsskripten (`tauri:dev`, `tauri:build`, `tauri:build:local`).
- **Verifikation & Release Build Trigger**:
  - Sämtliche Typechecks, Vitest-Tests und Cargo-Checks erfolgreich durchgeführt.

---

## [1.0.26] - 2026-07-25

### 🧹 Codebase-Bereinigung & Refactoring
- **Gilden-Bereinigung & Entkopplung**:
  - Entfernen veralteter Gilden-Module (`guild-service.js`, `GuildUI.js`) und Bereinigung der DI-Container-Registrierung (`js/core/di/config.js`) sowie der Boot-Initialisierung in `game-boot.js`.
- **Projekt-Struktur & Skript-Aufräumung**:
  - Verlagerung von `server/test-live.js` nach `scripts/test-live.js` und Entfernung nicht benötigter i18n-Dateien (`i18n/de.json`, `i18n/en.json`).
- **NPM Package.json Aufteilung**:
  - Säuberung der `package.json` devDependencies.
- **Gründliche Testverifikation**:
  - Erfolgreiche Ausführung aller 115 Frontend Unit-Tests, 26 Rust Integrationstests und des Produktions-Builds.

---

## [1.0.25] - 2026-07-25

### 🔐 AppConfig, AES-256-GCM Verschlüsselung, Argon2id & JWT Backend-Erweiterung
- **TOML Konfigurations-Management (`src-tauri/src/config.rs`)**:
  - `AppConfig` Struktur mit TOML-Persistenz (`config.toml`), automatischer Erstellung kryptographisch sicherer Zufalls-Keys bei Erststart und flexiblen Umgebungsvariablen-Overrides (`AUTH_JWT_SECRET`, `CRYPTO_ENCRYPTION_KEY`, etc.).
- **AES-256-GCM Symmetrische Verschlüsselung (`src-tauri/src/services/crypto.rs`)**:
  - `CryptoService` mit AES-256-GCM Verschlüsselung/Entschlüsselung (Base64-kodierte Payloads mit zufälligen 12-Byte Nonces) und SHA-256 Key-Normalisierung.
- **Argon2id Passwort-Hashing & JWT Tokens (`src-tauri/src/services/auth.rs`)**:
  - Ergänzung von Argon2id Passwort-Hashing via `argon2` Crate und signierter JWT-Token Generierung/Validierung via `jsonwebtoken`.
- **Tauri App-State & SQLite Integration (`src-tauri/src/lib.rs`)**:
  - `AppConfig` als verwalteter Tauri State (`.manage(app_config)`) registriert und Datenbank-Initialisierung via `DbManager::open_with_config` angebunden.
- **Erweiterte Backend-Testsuite**:
  - Rust Backend Unit- & Integrationstests auf **26 bestandene Tests** erweitert (inkl. `test_auto_generate_config_on_first_start`, `test_aes_256_gcm_encrypt_decrypt_roundtrip`, `test_argon2_hashing_in_auth_service`, `test_jwt_token_generation_and_verification`).

---

## [1.0.24] - 2026-07-24

### 📋 GitHub Issue Templates & Community Support
- **Strukturierte GitHub Issue Vorlagen (`.github/ISSUE_TEMPLATE/`)**:
  - `bug_report.md`: Detaillierte Fehlerberichts-Vorlage mit Schritten zur Reproduktion, Systeminformationen und betroffenen Komponenten (Frontend, Desktop Engine, Server, SQLite, CI/CD).
  - `feature_request.md`: Vorlage für Community-Vorschläge, neue Spielmechaniken, UI/UX-Ideen und Multiplayer-Features.
- **Erfolgreiche Verifikation & Build-Pipeline**:
  - Vollständige Ausführung aller 115 Frontend Unit-Tests und 18 Rust Backend Integration- & E2E-Tests.
  - Generierung der Produktions-Builds und Vorbereitung des automatisierten GitHub Actions Release-Workflows.

---

## [1.0.23] - 2026-07-24

### 🌐 Secure WSS Production Endpoint, Reverse Proxy Infrastructure & Monorepo-Dokumentation
- **Sicherer Production WebSocket Endpoint (`js/core/services/network-service.js` & `server/test-live.js`)**:
  - Umstellung der Standard-Server-URL von unverschlüsseltem WS auf gesichertes **`wss://api.archiv-des-vergessens.de`** (WSS mit SSL-Verschlüsselung auf Port 443).
  - Berücksichtigung von Umgebungsvariablen (`VITE_WS_URL` / `.env`) für flexibles Environment-Handling.
- **Server Deployment & Reverse Proxy Infrastruktur (`deploy/`, `server/README.md`)**:
  - `deploy/nginx/nginx.conf` und `deploy/caddy/Caddyfile` Konfigurations-Templates für Produktions-Setups hinzugefügt.
  - Ausführliche Anleitung für Certbot / Let's Encrypt SSL-Zertifikatseinrichtung in der Server-Dokumentation bereitgestellt.
- **Aktualisierte Monorepo- & Architektur-Dokumentation (`README.md`)**:
  - Umfassende Strukturübersicht der Monorepo-Ordner (`/js`, `/src-tauri`, `/server`, `/launcher`, `/css`, `/deploy`) ergänzt.
  - Systemanforderungen und Schnellstartanleitungen an die WSS-Produktionsumgebung angepasst.

---

## [1.0.22] - 2026-07-24

### 🔒 Gast-Account Konvertierungs-Transaktionen, Safe-Quit Optimierungen & Bugfixes
- **SQLite Transaktions-Sicherheit bei Gast-Konvertierung (`server/server.js`)**:
  - `db.transaction()` Wrapper für die atomare Umwandlung von Gast-Accounts in registrierte Konten.
  - Sichere Vorab-Validierung von bestehenden Speicherständen (`saves`) und Bestenlisten-Einträgen (`leaderboard`).
  - Automatisches Erstellen von Fallback-Speicherständen und Avatar-Sanitizing.
- **Mehrfenster Safe-Quit & Beendigungs-Schutz (`src-tauri/src/lib.rs` & `js/controllers/game-boot.js`)**:
  - `AtomicBool` Flag im Rust-Backend zur Verhinderung von Multiple-Close-Thread Race Conditions.
  - Behebung der fehlenden `cleanupDone`-Variablendeklaration im Browser/Desktop `beforeunload`-Eventlistener in `game-boot.js`.
- **Preact/UI Syntax-Fehlerbehebung (`js/ui/preact/account/AccountModal.js`, `js/ui/preact/views/LoginView.js`)**:
  - Korrektur von unterbrochenen String-Literalen in `getAuthErrorMessage` für den Fehlerfall `auth.error.username_too_similar`.
  - Erfolgreiche Verifizierung der TypeScript-Typenprüfung (`npm run typecheck`) und Frontend-Testsuite (115 passing tests).
- **Tauri 2 Fensterkonfiguration (`src-tauri/tauri.conf.json`)**:
  - Fensterlayout um Resizable-, Maximizable- und Maximized-Eigenschaften für optimierte Desktop-Benutzererfahrung erweitert.

---

## [1.0.21] - 2026-07-24

### 🧪 Vollständiges Rust-Test-Framework & Tauri 2.x Backend Refactoring
- **Tauri 2.x Backend Modul-Architektur (`src-tauri`)**:
  - Restrukturierung des Rust-Backends in ein sauberes Library-Crate (`archiv_des_vergessens_lib` in `src/lib.rs`) und einen schlanken Binär-Entrypoint (`src/main.rs`).
  - Entkoppelte Untermodule erstellt: `db/` (SQLite Database Manager), `services/` (PBKDF2 Auth & Idle Game Loop), `commands/` (Tauri IPC Handlers) sowie `test_utils.rs` (shared Mock-Testkontext).
- **Isolierte Rust Unit-, Integrations- & E2E-Tests**:
  - **SQLite In-Memory DB (`src/db/mod.rs` & `db_tests.rs`)**: Null-Seiteneffekt Testing mit isolierten In-Memory Datenbanken pro Testinstanz und `tempfile` Persistenz-Prüfung.
  - **PBKDF2 HMAC-SHA512 Password Security (`services/auth.rs` & `auth_tests.rs`)**: Tests für 100.000 Iterationen, 256-Bit Salt-Generierung, Constant-Time Hash-Vergleiche (`ct_eq`) und parametrisierte Testfälle mit `rstest`.
  - **Game Loop & Offline-Berechnungen (`services/game_loop.rs`)**: Tests für Präzisions-Ticks und 24-Stunden Offline-Fortschritts-Capping.
  - **Tauri Async Commands (`command_tests.rs`)**: Async Command Execution mit `#[tokio::test]`.
  - **End-to-End Testsuite (`app_tests.rs`)**: Gesamter App-Ablauf von Registrierung über Game-Ticks bis SQLite-Persistenz abgedeckt (18 bestandene Rust-Tests).
- **CI/CD Integration (`.github/workflows/test.yml`)**:
  - Automatisierte GitHub Actions Pipeline hinzugefügt für `cargo fmt -- --check`, `cargo clippy -- -D warnings`, `cargo test --all-features` und `cargo tarpaulin` Code-Coverage Reporting.

---

## [1.0.16] - 2026-07-24

### 🔢 Deutsche Zahlenformatierung & Prestige-Balancing
- **Zahlenformatierung (`js/utils/formatters.js` & `js/utils.js`)**:
  - `formatNumber(value, options)` implementiert, um große Zahlen in deutschem Idle-Game Standard zu formatieren (`Tsd.`, `Mio.`, `Mrd.`, `Bio.`, `Brd.`, wissenschaftliche Notation ab `1e18`).
  - Unterstützt `Number`, `String` und `BigInt` sowie negative Werte und Graceful Handling ungültiger Eingaben.
  - Zentrale Schnittstelle `js/utils.js` erstellt, welche Formatierungs- und Utility-Funktionen re-exportiert.
- **Prestige-Schwellenwert Balancing (`js/core/game/math.js` & `js/core/services/idle-service.js`)**:
  - Standard-Schwellenwert für das Erst-Prestige von `1000` auf `10.000` `mnemeFragmente` erhöht ($\lfloor \sqrt{\text{GesamtMneme} / 10000} \rfloor$), um ein optimales Erst-Prestige nach ca. 30–60 Minuten Spielzeit zu gewährleisten.
- **Tauri Updater Plugin Integration (`src-tauri`, `package.json`, `launcher.js`)**:
  - `tauri-plugin-updater` Abhängigkeit in `src-tauri/Cargo.toml` (v2.3.1) hinzugefügt.
  - Rust-Plugin `tauri_plugin_updater::Builder::new().build()` in `src-tauri/src/main.rs` registriert.
  - JS/TS-Side `@tauri-apps/plugin-updater` in `package.json` hinzugefügt und in `launcher.js` mit `check()`, Fortschrittsanzeige für `downloadAndInstall()` und automatischem `relaunch()` eingebunden.
  - `src-tauri/tauri.conf.json` um den `plugins.updater` Bereich mit `endpoints` und `pubkey` erweitert und `createUpdaterArtifacts: true` aktiviert.
- **Automatisierte Testabdeckung**:
  - Neue Testsuite `NumberFormatter.test.js` mit 9 Unit-Tests hinzugefügt.
  - Bestehende Prestige-Tests in `IdleService.test.js` und `IdleMathAndProgression.test.js` auf das neue Balancing angepasst (17 Testdateien, 115 bestandene Tests).

---

## [1.0.13] - 2026-07-24

### 🚀 Portable Executable Release, Standalone GitHub Releases & Seamless Launcher Transition
- **Schritt 1: Tauri Grundkonfiguration (`src-tauri/tauri.conf.json`)**:
  - Produktname in `ArchivDesVergessens` geändert (ohne Leerzeichen), um Pfadprobleme in automatisierten CI/CD Build-Prozessen zu vermeiden und einheitliche Binary-Dateinamen zu garantieren.
  - Launcher-Fenster auf initial sichtbar gesetzt (`visible: true`), Hauptfenster des Spiels initial verborgen (`visible: false`).
  - Bundle-Ziele und Tauri-Updater-Artifact-Erstellung deaktiviert (`"active": false`, `"targets": []`, `"createUpdaterArtifacts": false`).
- **Schritt 2: Automatisierter GitHub Actions Veröffentlichungsprozess (`.github/workflows/release.yml`)**:
  - Installer-Erstellung und ZIP-Archivierung in GitHub Actions entfernt.
  - Workflow führt nun `npm run tauri:build` aus und lädt die unverpackte `ArchivDesVergessens.exe` direkt als einzigen Anhang via `softprops/action-gh-release@v2` auf GitHub Releases hoch.
- **Schritt 3: Programmlogik im Rust-Backend (`src-tauri/src/main.rs`)**:
  - `launch_game` Befehl verfeinert: Macht das Hauptfenster sichtbar (`show()`), bringt es in den Fokus (`set_focus()`) und schließt das Launcher-Fenster verzögerungsfrei, um Ressourcen zu sparen.
  - Neuer Backend-Befehl `open_release_page` implementiert zum plattformübergreifenden Öffnen von externen Links im Standardbrowser.
- **Schritt 4: Portable Release Update-Prüfung (`launcher.js`)**:
  - Veraltetes `@tauri-apps/plugin-updater` entfernt.
  - Launcher führt bei Start eine direkte SemVer-Prüfung gegen die GitHub Releases API (`api.github.com`) durch.
  - Bei neuerer Version wird ein Button "UPDATE AUF GITHUB" sowie ein Hinweis-Toast angezeigt, die den Nutzer direkt zur Download-Seite auf GitHub Releases leiten.
  - Bei aktueller Version oder Offline-Betrieb steht "PLAY ADVENTURE" zum direkten Spielstart bereit.

### 🧮 Kern-Berechnungen, Delta-Time Game Loop, Kauf-Logik & Offline-Progression (Schritte 2-5)
- **Schritt 2: Reine Berechnungsbibliothek (`js/core/game/math.js`)**:
  - Neue Clean-Code-Datei `math.js` erstellt zur vollständigen Entkopplung der Berechnungslogik vom State.
  - Implementierung aller Formeln: `calculateBuildingCost`, `calculateBulkBuildingCost`, `calculateMaxAffordableLevel`, `calculateYieldPerSecond`, `calculateOfflineProgress` & `calculatePrestigeCurrency`.
- **Schritt 3: Game Loop Delta-Time Integration (`js/core/game/loop.js`)**:
  - `GameLoop` mit robuster `requestAnimationFrame` / `cancelAnimationFrame` Unterstützung und sicheren Fallbacks für Headless-/Testumgebungen ausgestattet.
  - Ticks nutzen präzise Delta-Time (`delta` ms) zur ununterbrochenen Ressourcenproduktion unabhängig von Browser-Tab-Drosselungen.
- **Schritt 4: Kauf-Logik & Mehrfach-Kauf Support (`IdleService` & `actions.js`)**:
  - State-Action `buyIdleGeneratorLevel` in `actions.js` um optionalen `count`-Parameter erweitert.
  - `IdleService` bietet nun `getGedankenArchivBulkCost`, `buyGedankenArchivLevel(count)` sowie `buyGedankenArchivMax()` für Max-Kauf.
- **Schritt 5: Offline-Progression bei Spielstart (`NavigationController`)**:
  - `_loadGame()` in `navigation.js` um automatische Berechnung der Offline-Produktion des `gedankenArchivs` (Mneme-Fragmente) erweitert.
  - Anrechenbare Offline-Zeit wird auf max. 12 Stunden begrenzt und im Offline-Overlay gewährt.
- **Automatisierte Testabdeckung & Typen**:
  - Neue Vitest-Testsuite `IdleMathAndProgression.test.js` mit 12 Tests hinzugefügt (16 Testdateien, 106 bestandene Tests).
  - JSDoc State-Typisierung in `manager.js` für `idleGenerators` aktualisiert (`npm run typecheck` fehlerfrei).

---

## [1.0.12] - 2026-07-24

### ♾️ Standard Idle-Game Mathematik & Lore Integration
- **Branchenstandard-Formeln Implementiert (`IdleService`)**:
  - **Kostenformel (Upgrades/Gebäude)**: $\text{Kosten} = \lfloor \text{BasisKosten} \cdot 1.15^{\text{Level}} \rfloor$ (15% exponentielle Steigerung pro Stufe).
  - **Ertragsformel (Ressourcen/Sekunde)**: $\text{ErtragProSekunde} = \text{BasisErtrag} \cdot \text{Level} \cdot (1 + \sum \text{UpgradeBonusse}) \cdot \text{PrestigeMultiplikator}$.
  - **Prestige-Formel (Verewigung)**: $\text{PrestigeWährung} = \lfloor \sqrt{\frac{\text{GesamtRessourcen}}{\text{Schwellenwert}}} \rfloor$ (Wurzel-Skalierung zur Eindeudung des Wachstums).
- **Archiv des Vergessens Lore Mapping**:
  - **Ressource**: `mnemeFragmente` (`resources.mnemeFragmente`, kumulativ getrackt via `resources.totalMnemeFragmente`).
  - **Generator/Gebäude**: `gedankenArchiv` (`idleGenerators.gedankenArchiv`).
  - **Prestige-Währung**: `ewigeMneme` (`resources.ewigeMneme`), gewährt einen dauerhaften Multiplikator-Boost (+10% pro Ewige Mneme).
- **State & DI Integration**:
  - State-Klassifizierung und Migration in `manager.js`, Pure-Reducer Actions in `actions.js`, Selektoren in `selectors.js` sowie DI-Container Registrierung von `IdleService` in `config.js`.
- **Automatisierte Testabdeckung**:
  - Neue Vitest-Testsuite `IdleService.test.js` mit 11 Tests hinzugefügt (15 Testdateien, 94 bestandene Tests).

### 🧹 Refactoring & Code-Vereinfachung (Phase 5)
- **Intro-Partikelsystem Vereinfacht**:
  - Ersetzung des überkomplexen Float32Array "Zero-Alloc Render Loops" (14 TypedArrays, OffscreenCanvas-Stamps & Index-Swapping) in [game-boot.js](file:///f:/Max_Projekte/archiv-des-vergessens/js/controllers/game-boot.js) durch einen sauberen, gut lesbaren Canvas-2D-Render-Loop auf Basis von Standard-JavaScript-Objekten (`createParticle()`).
  - Massiv gesteigerte Code-Lesbarkeit und Wartbarkeit bei identischer visueller Qualität und flüssiger 60fps Performance (90 Partikel max).

### 💎 Konsistenz & Datenbank-Optimierung (Phase 6)
- **Vereinheitlichte Datenbank-Abfragen (SQLite Collation)**:
  - Redundante Abfrage-Level-Klauseln (`COLLATE NOCASE`) sowie `.toLowerCase()`-Transformationen auf Login-Suchanfragen in `server/server.js` entfernt.
  - Die Datenbank verlässt sich nun konsequent auf die im Tabellenschema definierten Spalten-Collations (`username TEXT UNIQUE COLLATE NOCASE`, `email TEXT UNIQUE COLLATE NOCASE`), was den Server-Code vereinfacht und von SQLite-Indizes optimal profitiert.

### 🏗️ Architektur & Dependency Injection
- **DI-Container Repariert**:
  - Sämtliche manuellen, imperativen `set...Service()`- und `SaveManager.setServices()`-Aufrufe aus `js/controllers/game-boot.js` entfernt.
  - Vollständige Umstellung aller Core-Dienste auf Constructor Injection im `DIContainer` (`js/core/di/config.js`). Zirkuläre Abhängigkeiten (`NetworkService` <-> `AuthService` / `ChatService` / `LeaderboardService`) werden nun über elegante, träge Service-Resolver (`() => c.get(...)`) auflösungsfrei verarbeitet.
  - `SaveManager.setServices()` wird bei der Service-Anforderung im DI-Container automatisch ausgeführt.
- **Single Source of Truth für Einstellungen**:
  - `SettingsManager` (`js/core/settings.js`) als reiner Persistenz-Layer für `localStorage` neu strukturiert (keine parallele/doppelte State-Haltung mehr).
  - `StateManager` (`state.settings`) ist nun die einzige Quelle der Wahrheit (Single Source of Truth) für alle Spieleinstellungen.
  - `NavigationController` (`js/controllers/navigation.js`) dispatcht Einstellungsänderungen (`_setMusicVolume` etc.) direkt an den `StateManager` und speichert diese anschließend synchron über den `SettingsManager`.
- **Automatisierte Vitest-Tests**:
  - Neuer Testsuite `DIRefactorAndSettingsSSOT.test.js` hinzugefügt (14 Testdateien, 83 bestandene Tests), um DI-Automatismus und State-Single-Source-of-Truth für Einstellungen dauerhaft abzusichern.

---

## [1.0.11] - 2026-07-24

### 🚀 Performance & Cleanup
- **Electron API-Entfernung**: Sämtliche verbliebenen legacy `window.electronAPI`-Codeblöcke (`onQuitRequested`, `showMainWindow`, `onGameLaunched`, Auto-Updater IPC) aus `js/controllers/game-boot.js` und `js/controllers/navigation.js` entfernt. Die Anwendung nutzt nun ausschließlich standardmäßige Web-APIs (`beforeunload`, `window.close`) bzw. Tauri Native-Bindings.
- **Server Migrations-Optimierung**: Implementierung einer `migration_done.flag`-Datei in `server/server.js`. Sobald die Datenmigration von JSON zu SQLite einmalig abgeschlossen ist, verhindert das Flag bei jedem weiteren Serverstart unnötige Dateisystem-Checks (`fs.access`) und reduziert Server-I/O beim Hochfahren auf ein Minimum.

---

## [1.0.10] - 2026-07-24

### 🛡️ Sicherheit & XSS-Prävention (Server & Client)
- **Erweiterter Server-Sanitizer**: Die `sanitize`-Funktion in `server/server.js` wurde überarbeitet. Sämtliche Sonderzeichen (`&`, `<`, `>`, `"`, `'`) werden nun in genau definierter Reihenfolge vollständig in HTML-Entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) umgewandelt, bevor Texte in die Datenbank geschrieben oder per WebSocket gesendet werden.
- **Client Sanitizer Utility**: `escapeHtml`-Hilfsfunktion in `js/utils/sanitizer.js` ergänzt sowie Null-/Undefined-Absicherung in `sanitizeNumber` verbessert.
- **Automatisierte Unit-Tests**: Neuer Vitest-Testsuite `js/_tests_/Sanitizer.test.js` hinzugefügt, um HTML-Escaping, String-Säuberung und Server-Sanitizer-Logik umfassend abzutesten.

---

## [1.0.9] - 2026-07-24

### ⚙️ CI/CD, Build-Pipeline & Testing (Batch 6)
- **GitHub Actions Upgrade**: Node.js Version in allen Workflows (`deploy.yml` & `release.yml`) auf **Node.js 24.x** aktualisiert.
- **Rust-Caching**: `swatinem/rust-cache@v2` im Tauri Release-Workflow integriert für drastisch reduzierte Build-Zeiten.
- **Updater-Artifacts**: Parameter `createUpdaterArtifacts: true` in der `tauri-action` explizit aktiviert, um `.zip` / `.exe` / `.sig` Auto-Updater-Dateien zuverlässig zu erzeugen.
- **NSIS-Installer**: NSIS-Konfiguration in `tauri.conf.json` (`installMode: "both"`) überprüft und bestätigt für freie Wahl des Installationsverzeichnisses.
- **Unit-Tests & Typ-Prüfung**:
  - `AuthService.test.js` mit Vitest erweitert (Login-Flow, Offline-Fallback, Token-Verifizierung & Concurrent Auth Locks).
  - TypeScript-Typdeklarationen in `global.d.ts` und JSDoc in `account-vault-service.js` korrigiert für fehlerfreie `npm run typecheck` Ausführung.

---

## [1.0.8] - 2026-07-24

### 🛡️ Backend & Datenbank (Batch 1)
- **Passwort-Sicherheit**: Erhöhung der PBKDF2-Iterationen auf 100.000 mit SHA-512 und 64 Bytes Schlüssellänge.
- **Timing-Angriff-Schutz**: Vergleiche in `verifyPassword()` mittels `crypto.timingSafeEqual` und Längenvergleichen abgesichert.
- **Hash-DoS-Schutz**: Passwörter vor dem Hashing in `hashPassword()` sowie in allen Auth-Routinen (`register`, `login`, `convertGuest`) auf max. 128 Zeichen begrenzt.
- **Datenbank-Indizes & NOCASE**: SQLite-Indizes für `username` und `email` mit `COLLATE NOCASE` angelegt; Indizes für Leaderboard-Ranking (`idx_leaderboard_rank`) und Chatverlauf (`idx_chats_type_timestamp`, `idx_chats_type_guild_timestamp`) hinzugefügt.
- **WebSocket-Absicherung**: Typprüfungen für `ws.on('message')`, Abfangen ungültiger JSON-Strings / Payloads und geordnete Fehlerantworten.
- **Chat & Leaderboard**: Wiederverwendbare Chat-Historienauslieferung (`sendChatHistory`) bei allen Login-/Auth-Varianten; periodisches Chat-Pruning für minimale DB-Last.

---

## [1.0.7] - 2026-07-24

### 🐛 Behoben
- **Login- & Registrierungs-Button Reaktivität**:
  - `authService` in das `services`-Objekt in `game-boot.js` aufgenommen, sodass Preact UI-Komponenten ([LoginView](file:///f:/Max_Projekte/archiv-des-vergessens/js/ui/preact/views/LoginView.js) und [AccountModal](file:///f:/Max_Projekte/archiv-des-vergessens/js/ui/preact/account/AccountModal.js)) wieder ordnungsgemäß auf Anmelde- und Registrierungsversuche reagieren.
  - Vollständige Weiterleitung und Rückmeldung aller Server-Fehlermeldungen bei Login und Registrierung in `auth-service.js` repariert.

---

## [1.0.6] - 2026-07-24

### 🐛 Behoben & Tiefgehendes Audit
- **Ganzheitliches Login- & Registrierungs-Audit**:
  - **Backend-Sicherheit**: PBKDF2 Iterationen auf 100.000 erhöht, Timing-Safe-Passwortvergleiche (`timingSafeEqual`), SQLite-Indizes & `COLLATE NOCASE` für Case-Insensitive Suche, Passwortlängenbegrenzung (max. 128 Zeichen gegen Hash-DoS) und Absicherung gegen unvollständige WS-Payloads.
  - **Client-Authentifizierung**: `_isAuthenticating` Lock gegen Klick-Races, Entfernen doppelter Cloud-Save-Triggers (`loadFromCloud`), Behebung des fehlerhaften Token-Fallbacks und leckfreies Promise-Handling in `_pendingAuthResolves`.
  - **UI/UX & Lokalisierung**: `autofocus` für flüssige Formulareingabe, Lade-Spinner (`⏳`) in Absende-Buttons, vollständige i18n Fallback-Texte in `AccountModal.js` und optimierte Modal-Skalierung.

---

## [1.0.5] - 2026-07-24

### 🐛 Behoben & Optimiert
- **Login- & Registrierungsprozess**:
  - **Automatischer Login nach Registrierung**: Behebung eines Fehlers in `LoginView.js`, durch den angemeldete Konten nach der Registrierung fälschlicherweise ausgeloggt wurden. Registrierte Nutzer bleiben jetzt direkt angemeldet.
  - **Offline/Online Account Fallback**: Wenn der Live-Server bei der Anmeldung `user_not_found` meldet oder unerreichbar ist, prüft `AuthService` automatisch den lokalen Speicher. Bei korrektem Passwort erfolgt das Login offline und der Account wird im Hintergrund auf dem Server nachregistriert.
  - **Sicheres Token-Handling**: Verhindert ungewollten Logout bei temporären Server-Verbindungsabbrüchen.
  - **Vollständige Lokalisierung**: Ergänzung fehlender i18n-Fehlermeldungsschlüssel in Deutsch und Englisch (`auth.error.server_timeout`, etc.).

---

## [1.0.4] - 2026-07-24

### 🐛 Behoben & Optimiert
- **Produktiv-Build Server-Anbindung**:
  - `NetworkService` verbindet sich in Produktiv-Builds (Release Executable, GitHub Pages) jetzt verlässlich mit dem Live-Server `wss://grimoireinteractive.duckdns.org`.
  - Robuste Handshake- und Timeout-Abwicklung im `AuthService`.
  - Absicherung aller Auth-Routinen in `server/server.js` mit `try/catch`-Blöcken und geordneter Fehlerübertragung.

---

## [1.0.3] - 2026-07-24

### ✨ Hinzugefügt & Geändert
- **Produktiv-Authentifizierung & Registrierung**:
  - Implementierung eines vollständigen Accounts- und Authentifizierungssystems über WebSockets (`AuthService`).
  - SQLite-basierte Server-Persistenz für Benutzerkonten, gehashte Passwörter und Kontodaten auf dem Game-Server.
  - Überarbeitetes `AccountModal` und `LoginView` für flüssigen Login, Registrieren und Gast-Accounts.
- **Unit-Tests**:
  - `AuthService.test.js` für automatisierte Tests des Login- und Token-Ablaufs.

### 🐛 Behoben
- Synchronisationsprobleme und Z-Index-Überlagerungen im Account-Modal behoben.

---

## [1.0.2] - 2026-07-24

### ⚙️ CI/CD & Build
- Update der Node.js CI-Umgebung auf **Node 24.x** in den GitHub Actions Release-Workflows.
- Aktivierung von `createUpdaterArtifacts` für verlässliche Tauri-Updater-Pakete.

---

## [1.0.1] - 2026-07-24

### ⚙️ Build & Konfiguration
- Konfiguration von `createUpdaterArtifacts` in `tauri.conf.json`.

---

## [1.0.0] - 2026-07-24

### 🎉 Initial Release
- Offizieller Launch der Version 1.0.0 von **Archiv des Vergessens**.
- Zurücksetzen der Versionsnummer für den produktiven Release-Zyklus.

---

## [1.8.6] - 2026-07-24 (Pre-Release Milestone)

### ✨ Features & Performance
- **Launcher & Auto-Updater**:
  - Nahtloser Übergang vom Launcher zur Hauptanwendung.
  - Verzögerung der Intro-Wiedergabe bis zur vollständigen Öffnung des Vollbild-Fensters.
  - NSIS Installer mit Ordnerauswahl.
- **Hero & Inventar-Multi-Selection**:
  - Mehrfachauswahl im `HeroUI` zum Massen-Verwerten (*Bulk Salvaging*) von Ausrüstungsteilen.
- **Story UI & Navigation**:
  - Tastatur-Steuerung (Escape-Taste) für Story-Modale.
  - Flucht-Button und Z-Index Überarbeitungen für konsistente UI-Overlays.
- **Echtzeit-Kampf & Analytics**:
  - `CombatAnalyticsModal` und `FloatingDamageOverlay` mit optimierten EventBus-Subscriptions.

---

## [1.8.0] - 2026-07-23 (AAA Redesign Major Release)

### 🎨 Visuals & Lore
- **AAA Glassmorphic UI Redesign**:
  - Überarbeitung der Benutzeroberfläche mit custom Cursor Glow, Click Bursts und dynamischen Partikeleffekten.
  - Zweisprachige Lokalisierung (**DE / EN**) mit synchroner Umschaltung in allen Views.
- **Inhalte & Mechaniken**:
  - Mneme Skill-Baum mit verzweigten Aufwertungen.
  - DPS Meter für Echtzeit-Schadensanalyse.
  - Meister-Schmiede (*Master Forge*) mit Sockel- und Runensystem.
  - Gemeinsame Kontotruhe (*Shared Account Vault*) zur Gegenstandsübertragung.
- **Tauri 2 Integration**:
  - Migration auf Tauri 2 + Rust Core für native Performance und minimalen Ressourcenverbrauch.
  - Live Auto-Updater Integration via GitHub Releases.
