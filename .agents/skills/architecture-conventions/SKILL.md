---
name: architecture-conventions
description: Use when working on core architecture, DI, events, or folder structure of Archiv des Vergessens.
---

# Architecture & Conventions: Archiv des Vergessens

Dieses Dokument beschreibt die Kernarchitektur und Codierungsrichtlinien für das Projekt.

## Core Structure
- **Vite & Tauri**: Das Projekt ist eine Desktop-App (Tauri) mit einem Vite-Frontend.
- **ES Modules**: Alles im Frontend verwendet native ES-Module (`import`/`export`).
- **Core Systems**: 
  - `js/core/di/`: Dependency Injection. Services werden hierüber bereitgestellt.
  - `js/core/events/`: Event-Bus für entkoppelte Kommunikation.

## Coding Conventions
- **Naming**: 
  - Dateinamen: `kebab-case.js`
  - Klassen: `PascalCase`
  - Instanzen/Variablen: `camelCase`
- **Pure Functions**: Für Kern-Logik (z.B. in `math.js`) bevorzugen wir Pure Functions ohne Seiteneffekte.
- **Tauri APIs**: Interaktionen mit dem System immer über `@tauri-apps/api`.

## Process Lifecycle / Window Management
- **Closing the App**: NEVER use `window.close()` to exit the game, as it only kills the webview and leaves a white screen. ALWAYS use `window.electronAPI.sendQuitReady()` or `window.__TAURI__.core.invoke('quit_app')` to properly terminate the Tauri application.

## 🛑 Do not use
- Keine Frameworks wie Vue/Angular hinzufügen, die Architektur ist etabliert (Vanilla JS + Preact).
- Keine `require()` Aufrufe im Frontend-Code verwenden (Strict ES Modules).
- Keine globalen Variablen (State wird im `StateManager` verwaltet).
