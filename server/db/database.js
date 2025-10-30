import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we should use MySQL (production/Heroku) or SQLite (local)
const useMySQL = process.env.NODE_ENV === 'production' || process.env.JAWSDB_URL;

let db;

if (useMySQL) {
  // Import and use the unified database interface for MySQL
  const dbInterface = await import('./index.js');
  db = dbInterface.default;
} else {
  // Use SQLite for local development
  const Database = (await import('better-sqlite3')).default;
  db = new Database(join(__dirname, 'draft.db'));
  db.pragma('foreign_keys = ON');
}

export default db;
