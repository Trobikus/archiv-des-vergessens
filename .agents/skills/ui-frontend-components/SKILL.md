---
name: ui-frontend-components
description: Use when working on the user interface, Preact components, or vanilla DOM manipulation.
---

# UI & Frontend: Archiv des Vergessens

Dieses Dokument beschreibt, wie das Frontend strukturiert ist.

## Hybrid Approach
- Wir haben eine Trennung im `js/ui/` Verzeichnis:
  - `dom/`: Für direkte DOM-Manipulationen, wo Performance entscheidend ist oder keine Reaktivität gebraucht wird.
  - `preact/`: Für interaktive UI-Elemente nutzen wir Preact kombiniert mit `htm`.

## Preact & HTM
- `htm` (Hyperscript Tagged Markup) erlaubt es uns, JSX-ähnliche Syntax in reinem JavaScript zu schreiben.
- Setup importieren: `import { h, html } from '../setup.js';` -> `return html\`<div class="example">...</div>\`;`
- **Relative Import-Tiefen:** Achte bei Imports in Preact-Views strikt auf die Ordnertiefe (z.B. Views unter `js/ui/preact/views/` sind 3 Ebenen tief relativ zu `js/`, daher `../../../core/...`).

## Service Dependency Injection & Preact
- Alle in `game-boot.js` instanziierten Services, die von Preact-Views genutzt werden, MÜSSEN in der `services`-Map von `bootPreactUI({ services: { ... } })` übergeben werden.
- Sonst evaluieren sie beim Destrukturieren (`const { authService } = services || {}`) zu `undefined`.

## Modals & UI Isolation
1. **Z-Index:** `.modal-close` Buttons müssen einen höheren `z-index` als Overlay-Inhalte haben (z.B. `z-index: 1001`).
2. **Keyboard Accessibility:** Modals MÜSSEN einen `Escape`-Key-Listener via `useEffect` registrieren.
3. **Loop Interrupts:** Aktive Modals (z.B. Combat/Timer) müssen explizite Abbrechen/Fliehen-Buttons bieten.
4. **Canvas Isolation:** Vor Re-Binds Events meiden/clearen und `requestAnimationFrame`-Loops sauber stoppen.

## Styling
- Plain CSS in `css/` Ordner.
- Wir verwenden moderne CSS-Features (Variables, Grid, Flexbox), aber **kein TailwindCSS**.

## 🛑 Do not use
- Kein React installieren (wir nutzen Preact).
- Kein TailwindCSS einführen.
- Vermeide schwergewichtige UI-Bibliotheken (wie Material UI), wir schreiben die UI weitestgehend selbst.

