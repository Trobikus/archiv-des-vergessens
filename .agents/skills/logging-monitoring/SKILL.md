---
name: Logging & Monitoring Specialist
description: Use when adding logs to the server or formatting error outputs.
---

# Logging & Monitoring Specialist

This skill focuses on maintaining a structured and readable console output for the server without relying on external logging libraries if none are present.

## Activation
Activate this skill when:
- Adding new debug information to the server.
- Implementing error tracking for new features.
- Cleaning up console spam.

## Project Conventions
The server (`server/server.js`) uses standard `console.log`, `console.warn`, and `console.error`. However, it strictly enforces a prefixing convention to categorize logs.

When adding new logs, always prepend the relevant subsystem tag in brackets:
- `[Net]` for WebSocket connection events.
- `[Auth]` for login, registration, and session token events.
- `[Storage]` for SQLite database operations and save/load events.
- `[Backup]` / `[Recovery]` for database backup and restore logic.
- `[Migration]` for data format migrations.
- `[Database]` / `[Chat]` for specific feature events.

Example:
```javascript
// GOOD
console.log(`[Net] Neuer Verbindungsversuch von ${origin}`);
console.error(`[Auth] Registrierungsfehler: ${err.message}`);

// BAD
console.log("Jemand hat sich verbunden.");
```

## Do Not Use
- Do not use this skill to introduce heavy logging libraries (like Winston or Pino) unless explicitly requested. Stick to the existing `console` convention.

## Payload Sanitization vor Log
- Bevor ein WebSocket-Payload oder ein State-Objekt geloggt wird, MUSS es durch eine `sanitizeForLog()` Funktion laufen.
- Diese Funktion ersetzt bekannte sensitive Felder (`token`, `password`, `secret`, `apiKey`) automatisch mit `***`.
- Beispiel: `console.log('[Net] Received:', sanitizeForLog(payload));`
