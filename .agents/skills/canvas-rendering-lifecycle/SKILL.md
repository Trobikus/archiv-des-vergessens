---
name: Canvas Rendering Lifecycle
description: Use when integrating rAF loops in Preact or Vanilla JS to avoid memory leaks.
---

# Canvas Rendering Lifecycle

## Integration in Preact/Vanilla
- In Preact: Der rAF-Loop MUSS in `useEffect` gestartet und in der Cleanup-Funktion (`return () => cancelAnimationFrame(id)`) zwingend gestoppt werden.
- In Vanilla: Vor `startLoop()` MUSS immer `stopLoop()` aufgerufen werden, um doppelte Instanzen zu verhindern.
- Nutzung von `WeakMap` für Event-Listener, um Duplikate bei Re-Renders zu vermeiden.
