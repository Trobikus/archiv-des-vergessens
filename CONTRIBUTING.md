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

## 🚀 Erste Schritte für Entwickler

Um lokal an **Archiv des Vergessens** zu arbeiten, benötigst du **Node.js (v18+)** sowie für Desktop-Builds **Rust & Cargo**.

### 1. Repository klonen & Abhängigkeiten installieren

```bash
git clone https://github.com/Trobikus/archiv-des-vergessens.git
cd archiv-des-vergessens
npm install
```

---

### 2. Umgebungsvariablen (.env) konfigurieren

Erstelle im Hauptverzeichnis eine `.env` Datei (basierend auf `.env.example`):

```bash
cp .env.example .env
```

Für die lokale Entwicklung verbindet sich der Client standardmäßig mit deinem lokalen WebSocket-Server. Stelle sicher, dass folgende Variable in deiner `.env` eingetragen ist:

```env
# WebSocket Server-URL für lokale Entwicklung (Multiplayer & Sync):
VITE_WS_URL=ws://localhost:8080

# Für spätere Tests gegen den Produktiv-Server:
# VITE_WS_URL=wss://api.archiv-des-vergessens.de
```

> **Erläuterung der Umgebungsvariablen:**
> - `VITE_WS_URL`: Bestimmt die Adresse des Multiplayer-Backend-Servers.
>   - `ws://localhost:8080`: Nutzt deinen lokalen Node.js-Server (unkodiertes WebSocket).
>   - `wss://api.archiv-des-vergessens.de`: Verbindet sich mit dem offiziellen Produktiv-Server (TLS/SSL-verschlüsseltes WebSocket).

---

### 3. Node.js Multiplayer-Server lokal starten

Der Multiplayer-Server verarbeitet Accounts, Gilden, globale Bestenlisten und Chats mit serverseitiger SQLite-Persistenz.

Öffne ein Terminal und führe folgende Befehle aus:

```bash
# In das Server-Verzeichnis wechseln
cd server

# Server-Abhängigkeiten installieren
npm install

# Server im Entwicklungsmodus (mit automatischer Aktualisierung bei Dateiänderungen) starten
npm run dev
```

Der Server läuft nun lokal auf `ws://localhost:8080` und speichert Daten lokal im Ordner `server/data/`.

---

### 4. Tauri Desktop Dev-Server starten

Öffne ein **zweites Terminal-Fenster** im Wurzelverzeichnis des Projekts:

```bash
# Tauri Desktop-App im Entwicklungsmodus starten
npm run tauri:dev
# Alternativ: npm run game:dev
```

**Was dabei passiert:**
1. Vite startet den Frontend-Entwicklungsserver mit Hot Module Replacement (HMR).
2. Rust kompiliert die nativen Desktop-Bindings (`src-tauri`).
3. Ein Fenster der Anwendung öffnet sich und verbindet sich automatisch mit Vite sowie deinem lokalen Multiplayer-Server.

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

