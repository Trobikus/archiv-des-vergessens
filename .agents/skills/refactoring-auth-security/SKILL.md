---
name: Auth & Critical Code Refactoring Specialist
description: Use when refactoring authentication, session management, or other security-relevant server code.
---

# Auth & Critical Code Refactoring Specialist

This skill focuses on safely restructuring code that handles user authentication, secure WebSocket sessions, and critical data access.

## Activation
Activate this skill when refactoring:
- Login, registration, or token generation flows.
- WebSocket session validation and hijacking prevention.
- Any code that reads, writes, or verifies user credentials.

## Safety & Workflow
- **Full Coverage Required:** Do not refactor auth code without complete test coverage. If tests are missing, write them first.
- **No Behavioral Changes:** Security patches are an exception, but pure refactoring must not change how sessions timeout, how tokens are structured, or what data is exposed.
- **Explicit Notification:** If you discover a security vulnerability while refactoring or if a change might impact the security model, you MUST explicitly notify the user and ask for guidance before proceeding.
- **Audit Logs:** Ensure that any existing security logging (e.g., failed login attempts, disconnected sessions) remains intact and logs the exact same information after the refactor.

## Project Context
- **WebSockets:** Pay close attention to how session tokens are passed during WebSocket handshakes (`test-live.js` connects to `SERVER_URL`).
- **Data Layer:** Refactoring how user data is fetched from SQLite must ensure no unintended data exposure occurs.

## Do Not Use
- Do not use this skill to simply clean up frontend UI components related to the login screen, unless the underlying auth logic is also being changed.
