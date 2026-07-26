---
name: tests-quality-assurance
description: Use when writing unit tests, setting up Vitest, or typechecking with TypeScript.
---

# Tests & Quality Assurance: Archiv des Vergessens

Dieses Dokument beschreibt das Test-Setup.

## Frameworks
- **Vitest**: Wir nutzen Vitest für alle Unit- und Integration-Tests (`vitest run`).
- **Setup**: Globale Mocks und Setup-Skripte befinden sich in `js/_tests_/setup.js`.
- **Reporter**: Für CI/CD nutzen wir `jest-junit` als Reporter.

## TypeScript (Typechecking)
- Der Code ist primär JavaScript, jedoch nutzen wir JSDoc für Typisierungen.
- `tsc --noEmit -p tsconfig.json` wird verwendet, um den Code statisch auf Typfehler zu prüfen.
- Nutze `@typedef` und `@param` in JSDoc ausgiebig.

## 🛑 Do not use
- Kein `jest` oder `mocha` verwenden. Vitest ist der Standard in unserem Vite-Ökosystem.
- Schreibe keine reinen UI-Tests für Komponenten, die sich häufig ändern, konzentriere dich auf Core-Game-Logic und Math-Functions.
