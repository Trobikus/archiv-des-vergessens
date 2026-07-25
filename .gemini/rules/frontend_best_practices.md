---
description: Best practices für TypeScript, IndexedDB und Preact Import-Pfade.
---

# IndexedDB TypeScript Fix
Wenn mit IndexedDB in TypeScript (oder TS-geprüftem JS) gearbeitet wird, darf in Event-Callbacks (`onsuccess`, `onupgradeneeded`) nicht `event.target.result` verwendet werden. Dies führt zu dem Fehler: `Property 'result' does not exist on type 'EventTarget'`.
Verwende stattdessen direkt das Request-Objekt.

**Richtig:**
```javascript
const request = store.get(key);
request.onsuccess = () => resolve(request.result);
```

**Falsch:**
```javascript
const request = store.get(key);
request.onsuccess = (event) => resolve(event.target.result);
```

# Relative Import-Pfade (Preact)
Achte beim Hinzufügen von Imports in Preact-Views und Komponenten exakt auf die Ordnertiefe:
- Dateien unter `js/ui/preact/views/` sind 3 Ebenen tief (relativ zu `js/`).
- Um von `js/core/` in eine View zu importieren, nutze `../../../core/...`.
- Um von `js/ui/preact/shared/` in eine View zu importieren, nutze `../shared/...`.
- Das Setup-Skript liegt in `js/ui/preact/setup.js`, von einer View aus also `../setup.js`.
