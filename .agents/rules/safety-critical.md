# Safety Critical Rules

Sicherheitskritische Regeln, die strikt befolgt werden müssen, um Datenverlust oder Game-Breaking-Bugs zu vermeiden:

*   **Balancing:** Ändere **niemals** Balancing-Zahlen (Kosten, Multiplikatoren, Tick-Raten) ohne vorherigen Snapshot-Vergleich oder eine exakte Dokumentation der Auswirkungen. Jede Änderung hier muss durchgerechnet und vom Solo-Entwickler abgesegnet sein.
*   **Datensicherheit & Logging:** Es dürfen unter **keinen Umständen** Secrets, Passwörter, Hashes oder Auth-Tokens in Konsolen-Logs, Text-Dateien oder an den Client ausgegeben werden.
*   **Datenbank & Persistenz:** Führe **nie** DB-Migrationen aus, ohne dass zuvor ein lokales Backup der Datenbank (`data/*.db`) angefertigt wurde (bzw. ohne einen Dry-Run).
*   **Destruktive Aktionen:** Blockiere Löschvorgänge auf essenzielle Dateien (z.B. Save-Dateien, DB-Dateien). Nutze keine `rm -rf` oder `DROP TABLE` Befehle ohne explizite Freigabe.
