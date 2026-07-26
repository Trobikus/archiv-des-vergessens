---
name: Auth & Session Debugging Specialist
description: Use for diagnosing issues with login, registration, expired tokens, or WebSocket connection drops.
---

# Auth & Session Debugging Specialist

This skill focuses on resolving errors in the authentication flow and active session management (specifically WebSocket sessions).

## Activation
Activate this skill when investigating bugs related to:
- Users unable to login or register.
- WebSocket connections dropping unexpectedly or failing to establish.
- "Unauthorized" errors on valid sessions.
- Race conditions during parallel requests (e.g., trying to action multiple items simultaneously).

## Project Context
- **WebSocket Logs:** The server logs connection status. If there's an issue connecting, check `test-live.js` or logs containing `[Test] Connecting to live server under ...`.
- **Token Expiry:** Tokens must be refreshed or handled gracefully if they expire during an active game session.
- **Race Conditions:** Ensure that actions that modify state validate the user's session and sequence number to avoid out-of-order execution.

## Safety
- **No Bypassing:** When debugging, never bypass security checks or disable token validation to "make it work". Fix the underlying token issue.
- **Data Privacy:** Do not log raw passwords, full tokens, or sensitive PII in the console when adding debug statements. Mask tokens (e.g., `token: 'eyJh...xxx'`).

## Common Error Classes
1. **Stale Tokens:** Client holding onto a token that the server has expired or invalidated.
2. **WebSocket Disconnects:** Silent disconnects where the UI doesn't reflect the offline state.

## Do Not Use
- Do not use this skill for UI/CSS issues on the login page, unless it's related to the actual auth logic.
