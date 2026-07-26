---
name: SQLite Schema Migration & Rollback Protocol
description: Use this skill when modifying the SQLite schema or performing data migrations to ensure data safety.
---
# Skill: SQLite Schema Migration & Rollback Protocol

## 1. Pre-Migration Backup
- VOR jeder Ausführung eines `ALTER TABLE` oder `CREATE TABLE` Skripts MUSS eine Kopie der aktuellen `.sqlite` Datei im `backup/` Verzeichnis mit dem Suffix `.pre-migration` erstellt werden.

## 2. Transaktionale Migrationen
- Schema-Änderungen MÜSSEN innerhalb einer einzigen SQLite-Transaktion (`BEGIN TRANSACTION` ... `COMMIT`) erfolgen. Schlägt ein Schritt fehl, erfolgt sofort `ROLLBACK`.

## 3. Fallback & Recovery
- Wenn die Migration fehlschlägt und kein Rollback möglich ist (z.B. korrupte Datei), MUSS das System automatisch die `.pre-migration` Datei wiederherstellen, einen Fehler im `[Storage]` Logger mit Stacktrace protokollieren und den User im UI über einen "Wiederherstellungs-Modus" informieren, anstatt die App crashen zu lassen.
- Die `user_version` PRAGMA der SQLite-Datenbank MUSS nach erfolgreicher Migration inkrementiert werden, um wiederholte Ausführungen zu verhindern.
