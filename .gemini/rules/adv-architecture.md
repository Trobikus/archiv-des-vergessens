# Architektur & Refactoring (Archiv des Vergessens)

## 1. Architektur-Prinzipien
* **Schlanke Controller:** Controller (z.B. in `js/controllers/`) dürfen keine komplexe Geschäftslogik, Berechnungen oder Formatierungen enthalten. Sie sind primär für State-Updates, Event-Handling und View-Wechsel zuständig.
* **Logik-Auslagerung:**
  * Reine Hilfsfunktionen und Formatierer gehören in den Ordner `js/utils/`.
  * Komplexe Geschäftslogik (z.B. Ressourcenberechnungen, Offline-Fortschritt) gehört in dedizierte Services unter `js/core/services/`.

## 2. Strikter Refactoring-Workflow
* **Exakte Übernahme:** Bei Logik-Extraktionen muss das Verhalten exakt beibehalten werden, es sei denn, es ist explizit anders gefordert.
* **Grep-Check:** Nutze immer `grep_search` im gesamten `js/`-Ordner, um sicherzustellen, dass keine Referenzen auf alte Methodennamen übersehen werden.
* **Tests:** Für extrahierte Logik müssen Unit-Tests im `js/_tests_/`-Ordner angelegt oder ergänzt werden.

## 3. Verifikations-Pflicht
* Bevor ein Refactoring als abgeschlossen gilt, MÜSSEN folgende Befehle fehlerfrei durchlaufen:
  1. `npm run typecheck`
  2. `npm test`
  3. `npm run build`
* **Keine automatischen Commits:** Committe nichts ungefragt. Zeige immer den Plan oder Diff zur Freigabe.
