---
name: Network Reconciliation Protocol
description: Use this skill when implementing or debugging offline-to-online sync and state conflict resolution via WebSockets.
---
# Skill: Network Reconciliation Protocol (Offline-to-Online Sync)

## 1. Payload Struktur bei Reconnect
- Beim Wiederherstellen der WebSocket-Verbindung sendet der Client ein `sync:request`-Event.
- Dieses Event MUSS enthalten: `clientId`, `lastKnownServerTimestamp`, `clientCurrentStateHash` (oder relevante Checksums der Kernwerte), und `pendingActions` (lokal ausgeführte, aber noch nicht vom Server bestätigte Aktionen).

## 2. Server-Side Conflict Resolution
- Der Server vergleicht `lastKnownServerTimestamp` mit seinem eigenen State.
- **Fall A (Server ist neuer):** Der Server sendet ein `sync:override` mit dem autoritativen State. Der Client verwirft seine lokale Abweichung, wendet den Server-State an und führt `pendingActions` erneut gegen den neuen State aus (oder verwirft sie, wenn sie invalid sind).
- **Fall B (Client ist neuer / Offline-Progression):** Der Server akzeptiert die `pendingActions`, validiert sie gegen die Anti-Cheat-Regeln (`server-side-validation`), wendet sie an und sendet ein `sync:ack` mit dem neuen, bestätigten Server-State.

## 3. UI-State während der Sync-Phase
- Während der Sync-Phase (zwischen `sync:request` und `sync:override`/`sync:ack`) MUSS das UI einen nicht-blockierenden "Synchronisiere..."-Indikator zeigen.
- User-Interaktionen, die den State verändern, MÜSSEN in dieser Phase entweder in eine Warteschlange gestellt oder deaktiviert werden, um Race Conditions zu verhindern.
