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
