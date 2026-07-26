---
name: auth-websockets
description: Use when working on the Node.js WebSocket server, authentication, registration, or session handling.
---

# Auth & WebSockets: Archiv des Vergessens

Dieses Dokument beschreibt die serverseitige Multiplayer-Logik und Sicherheit.

## 🔒 Safety First (Sicherheit)
- **Klartext-Passwörter**: NIEMALS Passwörter im Plain-Text loggen, senden oder speichern!
- **Hashing**: Nutze streng die etablierten Konstanten für PBKDF2 (`server/server.js`):
  - `PBKDF2_ITERATIONS = 100000`
  - `PBKDF2_KEYLEN = 64`
  - `PBKDF2_DIGEST = 'sha512'`
- **Secrets**: Committe niemals private Keys (`private.key`) in das Git-Repo (sind in `.gitignore`).

## Architecture
- **WebSockets**: Echtzeitkommunikation (Chat, Leaderboard) läuft über `ws`. Keine REST-Endpunkte für Echtzeit-Logik verwenden.
- **Guest Conversion**: Beachte beim Konvertieren eines Gastes in einen regulären User, dass alle temporären Daten korrekt umgeschrieben werden.
- **Session Tokens**: Jede authentifizierte Aktion erfordert ein validiertes Session-Token (`sessionToken`).

## 🛑 Do not use
- Kein `bcrypt` oder andere Hash-Algos einführen (wir nutzen PBKDF2 via `node:crypto`).
- Keine externen Heavy-Weight Webframeworks (z.B. Express/NestJS), der Server soll extrem ressourcensparend (für 1GB RAM VMs) bleiben.
