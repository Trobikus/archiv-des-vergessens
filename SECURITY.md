# 🔒 Sicherheitshinweise (Security Policy)

Die Integrität und Sicherheit des „Archivs des Vergessens“ hat höchste Priorität. Wir nehmen alle Sicherheitsbedenken ernst und danken dir für deine verantwortungsvolle Mitarbeit dabei, das Archiv und seine Spieler zu schützen.

Dieses Dokument beschreibt, wie du Sicherheitslücken meldest und was du von uns erwarten kannst.

---

## 🛡️ Unterstützte Versionen

Wir konzentrieren unsere Sicherheitsupdates aktuell auf die folgenden Bereiche des Projekts:

| Bereich | Unterstützte Versionen |
| :--- | :--- |
| **Desktop Client (Tauri/Rust)** | Letzter stabiler Release (`main` / `latest`) |
| **Multiplayer Server (Node.js)** | Letzter stabiler Release (`main` / `latest`) |
| **Datenbank & Speicherung** | Aktuelle `better-sqlite3` Implementierung |

*Ältere Versionen oder experimentelle Branches werden nicht aktiv mit Sicherheitspatches versorgt.*

---

## 📬 Eine Sicherheitslücke melden

Bitte melde gefundene Schwachstellen **nicht** öffentlich über GitHub Issues, Discord oder Foren, um die Spieler nicht zu gefährden, bevor ein Fix bereitsteht.

Du hast zwei Möglichkeiten, uns sicher zu kontaktieren:

1. **GitHub Private Vulnerability Reporting (Empfohlen)**  
   Nutze den Tab „Security“ in diesem Repository und klicke auf „Report a vulnerability“. Dies erstellt eine private, verschlüsselte Diskussion zwischen dir und den Maintainern.
2. **Per E-Mail**  
   Sende eine detaillierte Beschreibung an: **[Grimoire.interactive@gmail.com]**  


---

## 📋 Was deine Meldung enthalten sollte

Um uns bei der schnellen Untersuchung und Behebung zu helfen, gib bitte so viele der folgenden Informationen wie möglich an:

- **Art der Schwachstelle** (z.B. XSS im Chat, SQL-Injection im Shared Vault, Rust-Panic durch manipulierte WebSocket-Payloads, Path Traversal).
- **Schritt-für-Schritt-Anleitung** zur Reproduktion des Fehlers.
- **Betroffene Komponenten** (Frontend/Preact, Tauri Core, Node.js Server, Datenbank).
- **Möglicher Impact** (Was könnte ein Angreifer erreichen? z.B. Datenleck, Account-Übernahme, Client-Absturz).
- **Proof of Concept (PoC)** (Screenshots, Code-Snippets oder ein minimales Skript, falls zutreffend).

---

## ⏳ Was du von uns erwarten kannst

1. **Bestätigung**: Wir bestätigen den Erhalt deiner Meldung innerhalb von **48 Stunden**.
2. **Überprüfung**: Unser Team bewertet die Schwachstelle und bestimmt ihren Schweregrad.
3. **Behebung**: Wir arbeiten an einem Fix und informieren dich über den Zeitplan. In der Regel streben wir eine Lösung für kritische Probleme innerhalb von **14 bis 30 Tagen** an.
4. **Danksagung**: Mit deiner Erlaubnis nennen wir dich in den Release Notes oder der `ACKNOWLEDGEMENTS.md` als verantwortungsvollen Melder.

---

## ⚠️ Richtlinien für verantwortungsvolle Offenlegung (Responsible Disclosure)

- Vermeide es, Schwachstellen auszunutzen, die über das zum Nachweis notwendige Maß hinausgehen (z.B. keine Daten anderer Spieler abrufen oder löschen).
- Veröffentliche keine Details zur Schwachstelle, bevor wir einen Patch bereitgestellt und öffentlich gemacht haben.
- Unterlasse jegliche Angriffe auf die Infrastruktur, die zu Dienstunterbrechungen (DoS) führen könnten.

---

*Danke, dass du uns hilfst, das Archiv des Vergessens sicher zu bewahren.* 🗝️
