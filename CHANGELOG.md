# Changelog

Alle nennenswerten Änderungen an **Archiv des Vergessens** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
