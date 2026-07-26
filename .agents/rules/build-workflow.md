# Build & Test Workflow Rules

Diese Regeln definieren den Standard-Workflow nach Änderungen am Code:

1. **Automatischer lokaler Build:** Nach jeder Durchführung einer Code-Änderung (insbesondere bei Änderungen an UI, Spiellogik oder Backend) MUSS zwingend ein lokaler Build der Executable angestoßen werden.
2. **Kommando:** Nutze dafür den Befehl `npm run tauri:build` im Root-Verzeichnis (`run_command` Tool). Da dieser Prozess dauern kann, kann er asynchron im Hintergrund laufen.
3. **Zweck:** Dies stellt sicher, dass der Entwickler immer sofort eine aktuelle `.exe` für manuelle Tests zur Verfügung hat und der Build-Prozess nicht durch die vorgenommenen Änderungen beschädigt wurde.
4. **Kommunikation:** Informiere den Entwickler in deiner Abschlussnachricht darüber, dass der Build angestoßen wurde oder erfolgreich war, und wo die `.exe` zu finden ist (z.B. `src-tauri/target/release/archiv-des-vergessens.exe`).
