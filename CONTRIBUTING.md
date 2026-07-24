# Contributing to Archiv des Vergessens

Vielen Dank, dass du Interesse hast, zum **Archiv des Vergessens** beizutragen! Jede Hilfe — ob Code, Feedback, Grafiken oder Ideen — ist hochwillkommen.

## Code of Conduct

Wir pflegen eine freundliche, inklusive und respektvolle Community. Bitte halte dich an folgende Grundsätze:

- Sei respektvoll und konstruktiv
- Akzeptiere unterschiedliche Meinungen
- Keine Diskriminierung, Belästigung oder toxisches Verhalten

## Wie du beitragen kannst

### 1. Bug Reports & Feature Requests

- Erstelle ein neues **Issue** mit klarer Beschreibung
- Für Bugs: Schritte zur Reproduktion, erwartetes vs. tatsächliches Verhalten, Screenshots/Logs
- Für Features: Beschreibe den Nutzen und ggf. eine mögliche Umsetzung

### 2. Pull Requests (Code-Beiträge)

**Workflow:**

1. Forke das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/meine-neue-idee`)
3. Mache deine Änderungen
4. Stelle sicher, dass Tests (falls vorhanden) laufen
5. Committe mit klarer Nachricht (`git commit -m 'feat: ...'`)
6. Erstelle einen Pull Request gegen den `main`-Branch

**Richtlinien:**

- Halte Änderungen fokussiert (ein PR = eine Funktion/Fix)
- Folge bestehendem Code-Stil (Prettier + Rustfmt)
- Füge bei neuen Features kurze Dokumentation hinzu
- Aktualisiere die `CHANGELOG.md` (siehe unten)

### 3. Andere Beiträge

- **Grafiken / UI / Sound**: Gerne! Kontaktiere uns vorher
- **Lokalisierung** (Englisch, weitere Sprachen)
- **Dokumentation** & Tutorials
- **Performance-Optimierungen**
- **Marketing-Material** (Trailer, Screenshots, Social-Media)

## Entwicklungsumgebung

```bash
# Repository klonen
git clone https://github.com/Trobikus/archiv-des-vergessens.git
cd archiv-des-vergessens

# Frontend + Tauri
npm install
npm run tauri:dev

# Server (separat)
cd server
npm install
npm run dev
```

## Sicherheit & Auto-Updater Key Management

Die Releases von **Archiv des Vergessens** werden mit einem Tauri-Signaturschlüssel signiert.
Private Schlüssel (`*.key`) dürfen **unter keinen Umständen** ins Git-Repository committet werden.

### Schlüssel generieren / rotieren

Um ein neues Schlüsselpaar für den Auto-Updater zu erstellen:

```bash
bash scripts/generate-updater-keys.sh
```

### GitHub Secrets Konfiguration

Trage folgende Repository Secrets unter `Settings > Secrets and variables > Actions` ein:

- `TAURI_PRIVATE_KEY`: Der vollständige Inhalt deiner privaten Schlüsseldatei (`~/.tauri/updater.key`).
- `TAURI_KEY_PASSWORD`: Das Passwort, das bei der Schlüsselgenerierung festgelegt wurde (falls vorhanden).

### Public Key im Code aktualisieren

Füge den Inhalt der generierten `.pub`-Datei in `src-tauri/tauri.conf.json` ein:

```json
"plugins": {
  "updater": {
    "pubkey": "<DEIN_NEUER_PUBLIC_KEY>",
    "endpoints": [
      "https://github.com/Trobikus/archiv-des-vergessens/releases/latest/download/latest.json"
    ]
  }
}
```

