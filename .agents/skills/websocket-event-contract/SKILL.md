---
name: WebSocket Event Contract Specialist
description: Use when adding or modifying event names and payload schemas for the game-state WebSocket communication.
---

# WebSocket Event Contract Specialist

This skill governs the conventions for the generic Game-Event Protocol over WebSockets, ensuring client and server speak the exact same language regarding game state (excluding pure authentication flows).

## Activation
Activate this skill when:
- Creating a new WebSocket event (e.g., `game:action`, `chat:send`).
- Modifying the expected JSON payload for an existing event.
- Handling error responses from the server to the client.

## Payload Schema Conventions
The server (`server.js`) expects messages to be stringified JSON objects with a strict format:
```json
{
  "type": "event:name",
  "payload": {
    "key": "value"
  }
}
```
If this structure is violated, the server will immediately drop the message or return an error.

## Event Naming
Use namespaces separated by colons:
- `game:sync` - Pushing state to the server.
- `chat:global` - Chat-related events.
- `leaderboard:update` - Leaderboard actions.

## Error Handling
When the server rejects an event due to invalid payload or logic, it should reply with an error event matching the namespace, e.g., `type: "chat:error"`, with a payload containing `{ "error": "Reason" }`. The client should have logic to handle these specific error types.

## Do Not Use
- Do not use this skill for connection management or authentication (e.g., `auth:login`). Use `auth-websockets` for that. This is strictly for the *data payload contracts* after a connection is established.

## State-Mutation & ACK-Pflicht
- Für alle Events, die den Game-State ändern (z.B. `game:buy`, `game:upgrade`), MUSS der Server ein `ack:success` oder `ack:fail` Event zurücksenden.
- **Client-Seite:** Der Client wendet die Änderung sofort an (Optimistic UI).
- **Timeout-Logik:** Wenn nach 2000ms kein `ack` eintrifft, MUSS der Client die Aktion automatisch rückgängig machen (Rollback) und den User informieren.
- Dies verhindert Drift zwischen Client und Server.
