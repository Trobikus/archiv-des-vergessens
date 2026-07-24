# Changelog

Alle nennenswerten Änderungen an **Archiv des Vergessens** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
