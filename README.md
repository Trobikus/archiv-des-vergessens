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
</p>

**Archiv des Vergessens** ist ein atmosphärisches **Idle-RPG** mit narrativer Tiefe, Echtzeit-Multiplayer, modernem AAA-Design und einer einzigartigen Welt rund um Erinnerung, Vergessen und die mystische Kraft der Mneme.

## 📖 Die Geschichte

In einer Welt, in der die Realität langsam zerfällt, ist das **Archiv** der letzte Hort der Erinnerungen der Menschheit. Als Hüter der Mneme sammelst du verblassende Fragmente der Vergangenheit, kämpfst gegen das Vergessen selbst und baust Allianzen mit anderen Wanderern auf.

Jede Partikel, die du sammelst, birgt eine Geschichte. Jeder Boss verkörpert eine verlorene Epoche. Jede Entscheidung formt nicht nur deinen Charakter, sondern trägt dazu bei, die Welt vor dem endgültigen Verlöschen zu bewahren.

## ✨ Highlights

- **Tiefes Idle-Progression-System**: Prestige, Mneme-Skillbaum, Artefakte, Meister-Schmiede & Sockelsystem
- **Server-Account-System**: Sichere Registrierung, Login, Gast-Zugang & SQLite-basierte Cloud-Speicherung
- **Echtzeit-Multiplayer**: Globaler Chat, Gilden-System & globale Bestenlisten
- **Vollständige Mehrsprachigkeit**: Dynamische Lokalisierung in **Deutsch (DE)** und **Englisch (EN)**
- **Atemberaubende visuelle Effekte**: AAA Glassmorphic Design, Canvas-Partikel, Vignetten, Custom Cursor Glow & Click-Bursts
- **Kampfanalyse & DPS Meter**: Detaillierte Statistiken und Echtzeit-Schadensanalyse
- **Live Auto-Updater**: Automatische In-App-Updates dank Tauri 2
- **Offline-Progression**: Exponentielles Wachstum mit großzügigen Belohnungen bei Abwesenheit

## 🖥️ Systemanforderungen

| Plattform    | Minimum                  | Empfohlen             |
| ------------ | ------------------------ | --------------------- |
| **Windows**  | Windows 10, 4 GB RAM     | Windows 11, 8 GB RAM  |
| **macOS**    | macOS 11 Big Sur         | macOS 13 Ventura      |
| **Linux**    | Kernel 5.4+, glibc 2.28+ | Aktuelle Distribution |
| **Speicher** | 300 MB Festplatte        | 1 GB                  |

**Hinweis**: Das Spiel läuft extrem ressourcenschonend und ist auch auf älterer Hardware flüssig spielbar.

## 🚀 Schnellstart

1. Lade die neueste Version von der [Releases-Seite](https://github.com/Trobikus/archiv-des-vergessens/releases/latest) herunter.
2. Starte das Setup oder führe `Archiv des Vergessens.exe` aus.
3. Erstelle einen Account oder starte direkt als Gast.
4. Der Client verbindet sich automatisch mit dem **öffentlichen Multiplayer-Server**.

**Öffentlicher Server**: `ws://35.209.11.134:8080` (öffentlich, stabil)

## 🎮 Features im Detail

### ⚔️ Kern-Gameplay & Progression
- **Mneme-Skillbaum**: Verzweigte Talentbäume zur Spezialisierung deines Charakters
- **Meister-Schmiede (Master Forge)**: Sockel- & Runensystem, Aufwertungen sowie Mehrfachauswahl (*Bulk Salvaging*) im Inventar
- **Kontoweite Truhe (Shared Vault)**: Sicherer Gegenstandstransfer zwischen verschiedenen Charakteren
- **Epische Boss-Kämpfe**: Einzigartige Phasen, Mechaniken und Boss-Drop-Tabellen

### 🌐 Multiplayer & Community
- **Globaler Chat & Gilden-Chat**: Persistent mit Nachrichten-History
- **Gilden-System**: Gemeinsames Leveln, Gilden-Boni und Kooperation
- **Globale Bestenliste**: Rankings nach Prestige, besiegten Bossen und Level
- **Sichere Cloud-Speicherung**: Automatische Synchronisation deiner Fortschritte via SQLite-Backend

### 🎨 Technische & Visuelle Exzellenz
- **Tauri 2 + Rust**: Leichtgewichtig, sicher, native Desktop-Performance
- **Preact + Vite + HTM**: Schnelles, reaktives UI ohne schweren Overhead
- **Vitest**: Automatisierte Frontend- & Service-Tests
- **Node.js + WebSockets + SQLite**: Skalierbares, ressourcenschonendes Multiplayer-Backend

## 🛠️ Technologie-Stack

- **Frontend**: Preact, HTM, Vite, Canvas API, CSS Glassmorphism
- **Desktop Engine**: Tauri 2 + Rust Core
- **Multiplayer Server**: Node.js, WebSockets (`ws`), `better-sqlite3`
- **Testing & Quality**: Vitest, TypeScript Typechecking
- **CI / CD**: GitHub Actions (Multi-Platform Builds & Auto-Release)

## 📌 Roadmap

### Phase 1 – Core Launch & Polishing (Aktuell)
- [x] Produktives Server-Account System (SQLite Persistence)
- [x] Live Auto-Updater Integration (Tauri 2)
- [x] Vollständige DE / EN Lokalisierung
- [x] AAA Glassmorphic Redesign & Performance-Optimierung

### Phase 2 – Erweiterte Inhalte
- [ ] Weitere Story-Kapitel & Boss-Encounter
- [ ] Erweitertes Gilden-System mit Gilden-Kriegen
- [ ] Erfolge (Achievements), Saisons & Community-Events
- [ ] Balancing-Updates basierend auf Community-Feedback

### Phase 3 – Plattformen & Modding
- [ ] itch.io & GameJolt Veröffentlichungen
- [ ] Modding-Support & Custom Relikte
- [ ] Mobile Companion App / PWA Support

## 🤝 Mitmachen & Community

Wir freuen uns über deinen Beitrag!
- **Issues**: Melde Bugs oder schlage neue Features vor.
- **Pull Requests**: Beachte bitte unsere [CONTRIBUTING.md](CONTRIBUTING.md).
- **Changelog**: Verfolge die Entwicklung in unserem [CHANGELOG.md](CHANGELOG.md).

**Entwickelt von Grimoire Interactive** – einem leidenschaftlichen Indie-Studio.

---

**Copyright © 2026 Grimoire Interactive**  
Lizenziert unter der [MIT-Lizenz](LICENSE). Eine vollständige Versionshistorie findest du im [Changelog](CHANGELOG.md).

---

_„In den Archiven der Erinnerung liegt die wahre Macht.“_
