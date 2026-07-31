# Archiv des Vergessens - Agent Configuration & Guidelines

Willkommen im Projekt "Archiv des Vergessens". Diese Datei dient als zentrale, stets gültige Projekt-Übersicht für alle KI-Agenten.

## Tech-Stack-Überblick
Dieses Projekt verwendet eine hybride Architektur für ein Idle-RPG:
*   **Client:** Tauri & Vite, basierend auf ES-Modules. Das UI ist ein Hybrid aus Preact (`htm`/`preact`) und Vanilla-DOM-Manipulationen.
*   **Server:** Node.js WebSocket-Server (`ws`) für die Multiplayer- und Sync-Logik.
*   **Datenbank:** `better-sqlite3` für synchrone, schnelle Persistenz.
*   **Architektur:** Event-Bus / Dependency-Injection-Architektur für modulare Logik.

## Spezialisierte Skills
Unter `.agents/skills/` existieren themenspezifische Skills (z. B. für Balancing, Auth, Persistenz, Debugging).
*   **Konsultation:** Lese die dortigen `SKILL.md`-Dateien, sobald du an einem Feature in dem entsprechenden Bereich arbeitest. Wenn du z.B. Persistenz änderst, konsultiere die Persistenz-Skills.
*   Die Skills enthalten spezifische Arbeitsabläufe und Constraints, die Redundanz und Inkonsistenzen bei Refactorings verhindern.

## Absolute, Nicht-Verhandelbare Regeln
Eine vollständige Liste der globalen Regeln findest du unter `.agents/rules/`. Hier sind die wichtigsten:
1.  **Tech-Stack-Treue:** Keine neuen Frameworks (kein React/Vue, kein TailwindCSS). WebSockets statt REST für neue Endpunkte. `better-sqlite3` bleibt synchron.
2.  **Safety-Critical Code:** Ändere nie Balancing-Zahlen ohne Snapshot-Vergleich. Führe keine DB-Migrationen oder destruktiven Shell-Befehle ohne vorheriges Backup aus. Keine Passwörter loggen.
3.  **Response-Format:** Antworten sollen kurz und prägnant sein, geänderte Dateien mit Pfaden auflisten und neu vs. erweitert trennen.

## Freigabe-Prozess (Solo-Entwickler)
Ich (Solo-Entwickler) muss in folgenden Fällen zwingend und **vorab** informiert werden, bevor du Änderungen vornimmst oder Code ausführst/generierst:
*   **Authentifizierung / Session-Handling:** Größere Änderungen an der Login/Registrierungs-Logik oder den JWT/Session-Tokens.
*   **Datenbank-Migrationen:** Jede Änderung am Schema (`better-sqlite3`), die potenziell bestehende Spielstände zerstören könnte.
*   **Balancing:** Anpassungen an Formeln oder Basiswerten, die die Spielökonomie grundlegend verändern.

In diesen Fällen lege mir zuerst deinen Plan vor und hole meine explizite Bestätigung ein.

## Cursor Cloud specific instructions

Dieses Repo ist ein Monorepo mit drei Teilen: Vite/Preact-Web-Frontend (Root), Node.js-WebSocket-Server (`server/`) und Tauri/Rust-Desktop-Core (`src-tauri/`). Standard-Befehle stehen in `README.md`, `CONTRIBUTING.md` und den `scripts`-Blöcken der `package.json`-Dateien. Nur nicht-offensichtliche Hinweise:

- **Lokale Server-URL:** Für lokale Multiplayer-/Sync-Tests muss eine `.env` im Root mit `VITE_WS_URL=ws://localhost:8080` existieren (`.env` ist gitignored, also bei jeder frischen VM neu anlegen). Ohne `.env` verbindet sich der Client im Vite-Dev-Modus zwar auch per Fallback auf `ws://localhost:8080`, aber jeder andere Kontext (z.B. Preview-Build) zeigt auf den Produktiv-Server `wss://grimoireinteractive.duckdns.org`.
- **Startreihenfolge:** Erst den WS-Server (`cd server && npm run dev`, Port 8080) starten, dann das Frontend (`npm run dev`, Port 3000). Beide sind separate Prozesse und laufen dauerhaft; nutze tmux. Der Vite-Dev-Server ist auf Port 3000 mit `strictPort: true` festgelegt (kein Auto-Fallback).
- **Frontend testen ohne Tauri:** Das komplette Spiel läuft im Browser über den Vite-Dev-Server (`http://localhost:3000`). `npm run tauri:dev` benötigt native WebKitGTK-Systembibliotheken und ein Display und ist im Headless-Cloud-Setup nicht nötig, um Gameplay/UI zu testen.
- **Server-Persistenz:** Der WS-Server legt beim Start automatisch die SQLite-DB und ein Backup unter `server/data/` an (gitignored). Kein manueller Migrationsschritt nötig.
- **Bekannter Zustand:** `npm run typecheck` meldet einen vorbestehenden Fehler in `js/ui/preact/shared/ModalShell.js` (TS2367). Das ist nicht durch das Setup verursacht; Vitest (`npm run test`) und die Server-Tests (`cd server && npm test`) sind grün.
- **Rust/Tauri:** `cargo test`/`cargo clippy` in `src-tauri/` brauchen die in `.github/workflows/test.yml` gelisteten System-Pakete (u.a. `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`). Ohne diese schlägt der Build von Tauri-Crates fehl.
