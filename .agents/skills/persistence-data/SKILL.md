---
name: persistence-data
description: Use when working on save games, cloud saves, SQLite database schema, or migrations.
---

# Persistence & Data: Archiv des Vergessens

Dieses Dokument beschreibt, wie Daten gespeichert und geladen werden.

## Server-side (Node.js)
- **SQLite**: Wir verwenden `better-sqlite3`. Es ist synchron und sehr schnell.
- **Integrität**: Bei jedem Server-Start wird `PRAGMA integrity_check` durchgeführt.
- **Auto-Backups**: Tägliche Backups der Datenbank werden in `data/backups/` gespeichert (max 7 Backups werden behalten).
- **Migrationen**: Initiale Migrationen werden durch die Datei `migration_done.flag` signalisiert.

## Client-side
- **Save Manager**: `js/core/persistence/save-manager.js` kümmert sich um lokale Speicherung.
- **Cloud Manager**: `js/core/persistence/cloud-manager.js` kümmert sich um den Sync mit dem Server.
- Datenformate sollten immer robust versioniert sein, damit alte Savegames nicht brechen.

## 🛑 Do not use
- Keine asynchronen SQLite-Treiber (`sqlite3` oder `sqlite`) installieren. `better-sqlite3` ist bewusst gewählt.
- Direkte Zugriffe auf LocalStorage außerhalb des `save-manager.js` sind verboten.
