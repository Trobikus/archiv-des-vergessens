---
name: Server-Side Validation & Anti-Cheat Specialist
description: Use when implementing or auditing validation logic in the WebSocket server to prevent cheating or invalid state.
---

# Server-Side Validation & Anti-Cheat Specialist

This skill focuses on ensuring that the client cannot dictate invalid progress to the server. The server must be the source of truth for game data limits and progression realism.

## Activation
Activate this skill when:
- Processing game state updates from the client (e.g., in `server.js`).
- Adding new progress fields that need validation (e.g., boss kills, max level).
- Writing anti-cheat mechanisms.

## Workflow
1. **Never Trust the Client:** Always assume incoming data is potentially manipulated.
2. **Cap Validation:** When parsing incoming payload data (e.g., in the `ws.on('message')` handler in `server/server.js`), apply hard caps using `Math.min(MAX_CAP, payload.value)`.
3. **Plausibility Checks:** Ensure time-based resources or idle progress are not completely disconnected from the actual elapsed time between server syncs.
4. **Data Sanitization:** Always use `parseInt` or `Number()` on numeric payload fields to prevent injection of unexpected types.

## Safety
**CRITICAL:** NEVER write raw client-submitted game state directly into the SQLite database without validation.
```javascript
// BAD
const level = payload.level;

// GOOD (from server.js)
const level = Math.min(MAX_LEVEL, Math.max(1, parseInt(payload.level) || 1));
```

## Project Context
- Validation logic happens inside the Node.js WebSocket server (`server/server.js`), primarily in the `game:sync` and similar event handlers.
- Auth validation (emails/usernames) is handled separately; this skill is for *game progression* data.

## Do Not Use
- Do not use this skill for authentication issues (login, registration). Use `auth-websockets` instead.
