# Archiv des Vergessens – Der Mneme-Bund

<p align="center">
  <img src="https://github.com/Trobikus/archiv-des-vergessens/blob/main/public/banner.png" alt="Archiv des Vergessens Banner" width="100%" />
</p>

<p align="center">
  <strong>Die Realität verblasst. Die Erinnerungen sterben.</strong><br>
  <em>Wirst du sie bewahren?</em>
</p>

<p align="center">
  <a href="https://github.com/Trobikus/archiv-des-vergessens/releases/latest">
    <img src="https://img.shields.io/github/v/release/Trobikus/archiv-des-vergessens?color=6B46C1&label=Download&style=for-the-badge" alt="Latest Release" />
  </a>
  <a href="https://github.com/Trobikus/archiv-des-vergessens/stargazers">
    <img src="https://img.shields.io/github/stars/Trobikus/archiv-des-vergessens?color=FFD700&style=for-the-badge" alt="Stars" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-41B883?style=for-the-badge" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-4A90E2?style=for-the-badge" alt="Platforms" />
  <img src="https://img.shields.io/badge/Engine-Tauri%202-FF6B6B?style=for-the-badge" alt="Tauri" />
  <img src="https://img.shields.io/badge/Tests-115%20JS%20%7C%2018%20Rust%20Passing-brightgreen?style=for-the-badge" alt="Tests" />
</p>

**Archiv des Vergessens** ist ein atmosphärisches, hybrides **Idle-RPG** mit narrativer Tiefe, Echtzeit-Multiplayer, deutschem Idle-Formatierungsstandard, modernem Glassmorphic AAA-Design und einer einzigartigen Welt rund um Erinnerung, Vergessen und die Macht der Mneme.

---

## 📖 Die Geschichte

In einer Welt, in der die Realität langsam zerfällt, ist das **Archiv** der letzte Hort der Erinnerungen der Menschheit. Als Hüter der Mneme sammelst du verblassende Fragmente der Vergangenheit, kämpfst gegen das Vergessen selbst und baust Allianzen mit anderen Wanderern auf.

Jedes Partikel, das du sammelst, birgt eine Geschichte. Jeder Boss verkörpert eine verblasste Epoche. Jede Entscheidung formt nicht nur deinen Charakter, sondern trägt dazu bei, die Welt vor dem endgültigen Verlöschen zu bewahren.

---

## ✨ Highlights & Features

- **Tiefes Idle-Progression-System**:
  - Exponentielles Wachstum mit Branchenstandard-Formeln ($1.15^L$ Steigerung)
  - **Deutsche Zahlenformatierung**: Elegante Notation (`Tsd.`, `Mio.`, `Mrd.`, `Bio.`, `Brd.` bis hin zu wissenschaftlicher Notation)
  - **Prestige-System**: Schalte *Ewige Mneme* frei (ab $10.000$ Mneme-Fragmenten) mit permanenten $+10\%$ Ertragsboosts
  - **Mengen-Kauf Option**: Mehrfachkauf (`x1`, `x10`, `x100`, `MAX`) für flüssige Progression
  - Offline-Progression mit automatischer Nachberechnung (bis zu 12 Stunden)
- **Ausrüstung & Schmiede**:
  - **Meister-Schmiede (Master Forge)**: Sockel- & Runensystem, Aufwertungen sowie Bulk-Verwertung (*Bulk Salvaging*)
  - **Kontoweite Truhe (Shared Vault)**: Sicherer Gegenstandstransfer zwischen Charakteren
- **Server-Account & Server-Persistence**:
  - Benutzerkonto mit Login, Registrierung oder Schnellstart via Gast-Zugang
  - Sichere SQLite-gestützte Cloud-Speicherung und automatische Synchronisation
- **Echtzeit-Multiplayer**:
  - Globaler Chat & Gilden-Chat mit Chat-Verlauf
  - Gilden-System mit gemeinsamen Boni
  - Globale Bestenlisten (Rankings nach Prestige, Bossen und Stufe)
- **Visuelle & Technische Exzellenz**:
  - Nahtloser Launcher mit automatischen In-App-Updates (Tauri 2 Updater Plugin)
  - Ultra-performantes Canvas-Partikelsystem (Zero-Lag 60 FPS)
  - AAA Glassmorphic Dark UI, Custom Glow-Effekte & dynamische Vignetten
  - Vollständige Zweisprachigkeit (**Deutsch DE** & **Englisch EN**)

---

## 🖥️ Systemanforderungen

| Plattform | Minimum | Empfohlen |
| :--- | :--- | :--- |
| **Windows** | Windows 10, 4 GB RAM | Windows 11, 8 GB RAM |
| **macOS** | macOS 11 Big Sur | macOS 13 Ventura |
| **Linux** | Kernel 5.4+, glibc 2.28+ | Aktuelle Distribution |
| **Speicher** | 300 MB Festplatte | 1 GB SSD |

*Hinweis: Das Spiel läuft dank Rust & Tauri 2 extrem ressourcenschonend und flüssig.*

---

## 🚀 Schnellstart (Für Spieler)

1. Lade die neueste portable Version (`ArchivDesVergessens.exe`) von der [Releases-Seite](https://github.com/Trobikus/archiv-des-vergessens/releases/latest) herunter.
2. Starte die Anwendung – keine Installation erforderlich!
3. Der integrierte Launcher prüft automatisch auf Updates.
4. Erstelle einen Account oder starte direkt als Gast.
5. Der Client verbindet sich automatisch mit dem öffentlichen Multiplayer-Server:
   - **Öffentlicher Server**: `ws://35.209.11.134:8080` (öffentlich, stabil)

---

## 💻 Entwicklung & Lokales Testen

### Voraussetzungen
- [Node.js](https://nodejs.org/) (v18 oder neuer)
- [Rust & Cargo](https://www.rust-lang.org/) (für Desktop-Builds)

### Befehle

```bash
# 1. Repository klonen
git clone https://github.com/Trobikus/archiv-des-vergessens.git
cd archiv-des-vergessens

# 2. Abhängigkeiten installieren
npm install

# 3. Web-Entwicklungsserver starten
npm run dev

# 4. Tauri Desktop-App im Entwicklungsmodus starten
npm run tauri:dev

# 5. Frontend Unit-Tests ausführen (Vitest)
npm run test

# 6. Backend Rust-Tests ausführen (Unit, Integration & E2E)
cargo test --manifest-path src-tauri/Cargo.toml

# 7. Rust Linter (Clippy) & Formatierung
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check

# 8. TypeScript Typenprüfung
npm run typecheck

# 9. Production Desktop-Build erstellen
npm run tauri:build
```

---

## 🛠️ Technologie-Stack

- **Frontend Core**: Preact, HTM, Vite
- **Desktop Runtime**: Tauri 2 (Rust Core)
- **Multiplayer Server**: Node.js, WebSockets (`ws`), SQLite (`better-sqlite3`)
- **Architektur**: Reducer State-Management, Dependency Injection Container, JSDoc Typing
- **Quality Assurance**: Vitest (115+ Frontend Unit-Tests) & Cargo Test Suite (18 Rust Unit-, Integrations- & E2E-Tests)
- **CI / CD**: GitHub Actions (Multi-Platform Portable & Release Pipelines, Rust Test Suite)

---

## 📌 Roadmap

### Phase 1 – Core Launch, Precision & Polishing (Abgeschlossen)
- [x] Produktives Server-Account System (SQLite Persistence)
- [x] Live Auto-Updater Integration (Tauri 2 Plugin)
- [x] Deutsche Idle-Zahlenformatierung (`Tsd.` – `Brd.`)
- [x] Re-Balancing der Prestige-Schwellenwerte (10.000 Mneme Erst-Prestige)
- [x] Exponentielles Idle-Wachstum & Bulk-Buying (x1/x10/x100/Max)
- [x] Vollständige Testabdeckung (115 Unit Tests)
- [x] Vollständige DE / EN Lokalisierung

### Phase 2 – Erweiterte Inhalte & Social Features (In Arbeit)
- [ ] Weitere Story-Kapitel & Epische Boss-Encounter
- [ ] Erweitertes Gilden-System mit Gilden-Kriegen & Monumenten
- [ ] Erfolge (Achievements), Saisons & Community-Events
- [ ] Balancing-Updates basierend auf Live-Community-Feedback

### Phase 3 – Plattformen & Modding
- [ ] itch.io & GameJolt Veröffentlichungen
- [ ] Modding-Support & Custom Relikte
- [ ] Mobile Companion App / PWA Support

---

## 🤝 Mitmachen & Community

Wir freuen uns über Feedback, Bugreports und Beiträge!
- **Issues**: Melde Fehler oder schlage neue Features auf GitHub vor.
- **Pull Requests**: Bitte lies unsere [CONTRIBUTING.md](CONTRIBUTING.md) vor der Erstellung von PRs.
- **Changelog**: Eine detaillierte Übersicht aller Versionsänderungen findest du im [CHANGELOG.md](CHANGELOG.md).

**Entwickelt von Grimoire Interactive** – einem leidenschaftlichen Indie-Studio.

---

**Copyright © 2026 Grimoire Interactive**  
Lizenziert unter der [MIT-Lizenz](LICENSE).  

_„In den Archiven der Erinnerung liegt die wahre Macht.“_
