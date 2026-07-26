---
name: idle-progression-mechanics
description: Use when calculating costs, implementing offline progression, tick loops, or resource balancing.
---

# Idle-Progression & Mechanics: Archiv des Vergessens

Dieses Dokument beschreibt die Kernmechaniken für das Idle-RPG.

## Game Loop & Ticks
- **Loop**: Die `GameLoop` (`js/core/game/loop.js`) nutzt `requestAnimationFrame`.
- **Ticks**: 
  - *Logic-Tick*: Frequenz 100ms (für schnelle Updates).
  - *Slow-Tick*: Frequenz 500ms (für schwerere Berechnungen).
- **Anti-Speed-Hack**: Die Loop verwendet Delta-Clamping, um Time-Cheats abzufangen.
- **Catchup**: Für Offline-Fortschritt ist eine Catchup-Logik implementiert, um Ticks nachzuholen.

## Math & Balancing
- **Pure Math**: Alle Balancing-Funktionen liegen in `js/core/game/math.js`.
- **Kalkulation**: Nutze `calculateBuildingCost` und `calculateBulkBuildingCost`. Industriestandard für Multiplikatoren ist oft `1.15`.
- **Sanitizer**: Bei allen Spieler-Eingaben oder Berechnungen mit großen Zahlen **IMMER** `sanitizeNumber` aus `js/utils/sanitizer.js` verwenden.

## 🛑 Do not use
- Keine Berechnungen von Spielstatus direkt in UI-Komponenten (Logik muss in `core/game` oder `core/services` liegen).
- Verlasse dich nicht auf standard `Math.random()` für kritische Drops, wenn ein deterministischer Seed gefordert ist.
- Niemals rohe Floats ungeprüft abspeichern (immer sanitizen).

## Anti-Speed-Hack & Catchup-Interaktion
- Der Anti-Speed-Hack (Max-Ticks-per-Second Limit) MUSS deaktiviert sein, solange die `isCatchingUp` Flag `true` ist.
- Die `isCatchingUp` Flag wird gesetzt, sobald die App startet und die Differenz zwischen `lastSaveTimestamp` und `now` > 5 Minuten ist.
- Sie wird erst wieder auf `false` gesetzt, wenn alle Offline-Ticks berechnet und der State stabilisiert ist.
- Erst NACH dem Catchup greift der Anti-Speed-Hack wieder normal.
