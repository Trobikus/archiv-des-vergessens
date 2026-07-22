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
