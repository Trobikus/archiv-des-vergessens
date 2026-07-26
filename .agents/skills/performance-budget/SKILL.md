---
name: Long-Session Performance & Stability Budget
description: Use this skill to enforce DOM, Memory, and Frame-Time budgets for long-running idle game sessions.
---
# Skill: Long-Session Performance & Stability Budget

## 1. DOM-Bloat Prevention
- Listen von Events, Logs oder Items im UI MÜSSEN ein hartes Limit haben (z.B. max 50 Einträge). Neue Einträge pushen alte heraus (FIFO), oder es wird virtuelles Scrollen (Virtualization) verwendet.
- `setInterval` für UI-Updates (z.B. animierte Zahlen) ist verboten. Nutze ausschließlich den zentralen `requestAnimationFrame` Game-Loop oder CSS-Transitions.

## 2. JS-Heap & Memory Budget
- Große, temporäre Arrays (z.B. bei der Berechnung von Offline-Progression über 1000+ Ticks) MÜSSEN nach der Verwendung explizit dereferenziert (`array = null`) oder mittels `array.length = 0` geleert werden, um den Garbage Collector zu entlasten.
- Vermeide das Erstellen neuer Objekte/Funktionen innerhalb des `requestAnimationFrame`-Loops (No-Allocation-in-Loop Rule).

## 3. Frame-Time Monitoring
- Der Game-Loop MUSS eine einfache Frame-Time-Überwachung besitzen. Wenn 5 aufeinanderfolgende Frames > 32ms (unter 30 FPS) benötigen, MUSS das System nicht-kritische visuelle Effekte (Partikel, komplexe Canvas-Overlays) automatisch deaktivieren (Degradation Mode), bis sich die Performance erholt.
