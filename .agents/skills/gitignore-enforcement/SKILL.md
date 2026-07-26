name: gitignore-enforcement
description: Verhindert das versehentliche Committen von sensiblen Daten, User-Saves, Build-Artefakten und temporären Dateien.
---
# Skill: Git-Ignore Enforcement

## Zweck
Verhindert das versehentliche Committen von sensiblen Daten, User-Saves, Build-Artefakten und temporären Dateien.

## Standard `.gitignore` für Tauri + Node + SQLite Projekte

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/
src-tauri/target/

# Database & Saves (SENSIBLE USER-DATEN)
*.sqlite
*.sqlite-journal
*.db
saves/
backups/
*.save

# Environment & Secrets
.env
.env.local
.env.*
*.key
*.pem
*.p12
secrets.json
credentials.json
config.local.json

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Test & Coverage
coverage/
.nyc_output/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temp files
*.tmp
*.bak
```

## History-Cleanup-Workflow

### Zweck
Entfernt sensible Dateien **vollständig** aus der Git-History (nicht nur aus dem Working Directory), damit sie nicht mehr über `git checkout` oder GitHub Web-UI wiederhergestellt werden können.

### Schritt 1: Erkennung
Wenn der Hook eine sensible Datei in der History erkennt:
```bash
# Prüfe ob Datei jemals committet wurde
git log --all --full-history -- "*.sqlite"
git log --all --full-history -- ".env"
git log --all --full-history -- "saves/"
```

### Schritt 2: Cleanup-Skript ausführen
Führe das Skript `.agents/scripts/clean-git-history.js` aus:

```bash
node .agents/scripts/clean-git-history.js --pattern "*.sqlite"
node .agents/scripts/clean-git-history.js --pattern ".env"
```

Das Skript:
* Erstellt ein Backup des aktuellen Repos: `git clone --mirror . ../repo-backup.git`
* Nutzt `git filter-repo` (oder BFG Repo-Cleaner falls verfügbar), um die Datei aus allen Commits zu entfernen.
* Bereinigt die Reflogs: `git reflog expire --expire=now --all`
* Führt Garbage Collection durch: `git gc --prune=now --aggressive`

### Schritt 3: Force-Push
Nach der Bereinigung MUSS explizit die Zustimmung des Users eingeholt werden.
**Warnung an User:** "Die History wurde bereinigt. Ein Force-Push ist erforderlich, um die Änderungen auf GitHub zu übernehmen. Dies wird die Remote-History überschreiben. Bestätige mit `yes`."

NUR nach expliziter Bestätigung durch den User:
```bash
git push origin --force --all
git push origin --force --tags
```
