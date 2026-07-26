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
- `htm` (Hyperscript Tagged Markup) erlaubt es uns, JSX-ähnliche Syntax in reinem JavaScript (ohne Build-Step Zwang) zu schreiben: `html\`<div class="foo">...</div>\``.
- Alle Komponenten sollten klein, modular und wiederverwendbar sein.

## Styling
- Plain CSS in `css/` Ordner.
- Wir verwenden moderne CSS-Features (Variables, Grid, Flexbox), aber **kein TailwindCSS**.

## 🛑 Do not use
- Kein React installieren (wir nutzen Preact).
- Kein TailwindCSS einführen.
- Vermeide schwergewichtige UI-Bibliotheken (wie Material UI), wir schreiben die UI weitestgehend selbst.
