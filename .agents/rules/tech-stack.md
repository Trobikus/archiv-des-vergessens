# Tech Stack Rules

Diese Regeln sind verbindlich für den gesamten Code des Projekts "Archiv des Vergessens" und gelten immer:

*   **UI & Styling:** Es wird ein Hybrid aus Preact (`htm`) und Vanilla-JS verwendet. **Kein React, kein Vue, kein Angular.** Für das Styling verwenden wir pures CSS. **Kein TailwindCSS, kein Bootstrap.**
*   **Netzwerk:** Für die Server-Kommunikation wird ausschließlich das WebSocket-Protokoll (`ws`) verwendet. Erstelle **keine REST-Endpunkte** für neue Features, binde sie stattdessen in den bestehenden Event-Bus via WebSockets ein.
*   **Datenbank:** Wir nutzen `better-sqlite3` serverseitig. Die API von `better-sqlite3` ist von Natur aus synchron. Versuche **nicht**, diese in asynchrone Promises zu wrappen oder auf asynchrone SQLite-Bibliotheken zu wechseln. Die synchrone Natur ist im System gewollt.
*   **Frontend-Build:** Wir verwenden Tauri mit Vite und ES-Modules. Nutze moderne Browser-Standards und vermeide alte CommonJS-Muster im Frontend.

## Datenbank-Nutzung (Präzisierung)
- `better-sqlite3` wird im Tauri-Backend synchron genutzt, um Callback-Hölle zu vermeiden.
- **VERBOTEN:** Synchrones Warten auf DB-Operationen im Frontend-Renderer (UI-Thread).
- Alle IPC-Calls (`invoke('db_read')`) MÜSSEN `async/await` nutzen. Der UI-Thread darf niemals durch DB-I/O blockiert werden.
