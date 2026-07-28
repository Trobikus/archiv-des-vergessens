import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'database.sqlite');

console.log(`[Leaderboard-Cleanup] Öffne SQLite-Datenbank: ${DB_FILE}`);

try {
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');

  // Prüfen, wie viele Einträge vor der Bereinigung existieren
  const countBefore = db.prepare('SELECT COUNT(*) as count FROM leaderboard').get().count;
  console.log(`[Leaderboard-Cleanup] Aktuelle Einträge in 'leaderboard': ${countBefore}`);

  // Rangliste vollständig leeren
  const result = db.prepare('DELETE FROM leaderboard').run();
  console.log(`[Leaderboard-Cleanup] ${result.changes} Einträge erfolgreich gelöscht.`);

  // Optimieren der Datenbank
  db.prepare('VACUUM').run();
  console.log('[Leaderboard-Cleanup] Datenbank erfolgreich optimiert (VACUUM).');

  db.close();
  console.log('[Leaderboard-Cleanup] Vorgang erfolgreich abgeschlossen.');
  process.exit(0);
} catch (err) {
  console.error('[Leaderboard-Cleanup] Fehler beim Leeren der Rangliste:', err);
  process.exit(1);
}
