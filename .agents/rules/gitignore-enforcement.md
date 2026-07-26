# Rule: Git-Ignore Enforcement

## 1. Pflichtprüfung vor Git-Operationen
VOR jeder Ausführung von `git add`, `git commit` oder `git push` MUSS Antigravity:
- Eine Prüfung aller neu hinzugefügten oder geänderten Dateien durchführen.
- Den Skill `gitignore-enforcement` konsultieren, um zu entscheiden, ob Dateien in die `.gitignore` gehören.
- Die `.gitignore` **automatisch erweitern**, wenn neue ignorierenswürdige Dateien erkannt werden.

## 2. Sensible Dateien (Sofort-Blockade)
Folgende Dateien dürfen **niemals** zu Git hinzugefügt werden und MÜSSEN sofort in die `.gitignore` aufgenommen werden:
- `*.sqlite`, `*.db`, `*.sqlite-journal` (User-Datenbanken)
- `*.save`, `saves/`, `backups/` (User-Saves und Backups)
- `.env`, `.env.*`, `*.key`, `*.pem`, `*.p12` (Secrets und Zertifikate)
- `secrets.json`, `credentials.json`, `config.local.json`

## 3. Build-Artefakte & Caches
Folgende Verzeichnisse MÜSSEN in der `.gitignore` sein:
- `node_modules/`
- `dist/`, `build/`
- `src-tauri/target/` (Rust Build-Artefakte, oft >1GB)
- `coverage/`, `.nyc_output/`
- `*.log`, `logs/`

## 4. OS-spezifische Dateien
- `.DS_Store`, `Thumbs.db`, `desktop.ini`

## 5. Automatische Erweiterung
Wenn Antigravity eine Datei erkennt, die nicht in die oben genannten Kategorien fällt, aber offensichtlich nicht ins Repo gehört (z.B. `*.tmp`, `*.bak`, lokale Configs), MUSS er:
- Die Datei zur `.gitignore` hinzufügen.
- Den User **vor dem Commit** informieren: "Ich habe `*.tmp` zur `.gitignore` hinzugefügt, da es sich um temporäre Dateien handelt."

## 6. Hook-Integration
Der `pre-tool-execution.js` Hook MUSS `git add` und `git push` blockieren, wenn:
- Sensible Dateien im Staging-Bereich erkannt werden.
- Die `.gitignore` nicht mindestens die oben genannten Standard-Muster enthält.

## 7. Retroaktive Bereinigung (Bereits übertragene Dateien)

### 7.1 Erkennung
VOR jedem `git push` MUSS Antigravity prüfen, ob sensible Dateien bereits im Remote-Repository existieren:
- Führe `git ls-remote --refs origin` aus, um die Remote-Branches zu prüfen.
- Führe `git log --all --full-history -- <sensitive-pattern>` aus, um zu sehen, ob die Datei jemals committet wurde.
- Wenn eine sensible Datei in der History gefunden wird, MUSS der Push **blockiert** werden.

### 7.2 Cleanup-Workflow
Wenn sensible Dateien in der History gefunden werden:
1. **Stoppe den Push** und informiere den User: "Achtung: Sensible Datei `X` wurde in der Git-History gefunden. Sie muss entfernt werden, bevor gepusht werden kann."
2. **Führe das Cleanup-Skript** `.agents/scripts/clean-git-history.js` aus.
3. **Erweitere die `.gitignore`** um die betroffenen Muster.
4. **Force-Push** nur nach expliziter User-Bestätigung: "Die History wurde bereinigt. Ein Force-Push ist erforderlich, um die Änderungen auf GitHub zu übernehmen. Dies wird die Remote-History überschreiben. Bestätige mit `yes`."

### 7.3 Secret-Exposition-Warnung
Wenn die bereinigte Datei ein Secret enthielt (z.B. `.env`, `*.key`):
- Warne den User: "Die Datei `X` war möglicherweise auf GitHub exponiert. Du solltest alle darin enthaltenen Secrets (API-Keys, Passwörter) sofort rotieren."
- Dokumentiere den Vorfall in einer lokalen Log-Datei `.agents/logs/security-incidents.log`.

### 7.4 Protected Branches
Wenn der Remote-Branch ein Protected Branch ist (z.B. `main`, `master`):
- Warne den User: "Der Branch `main` ist möglicherweise geschützt. Force-Push könnte abgelehnt werden. Kontaktiere den Repository-Admin, um den Schutz temporär zu deaktivieren."
