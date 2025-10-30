import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we should use MySQL (production/Heroku) or SQLite (local)
const useMySQL = process.env.NODE_ENV === 'production' || process.env.JAWSDB_URL;

let db;

if (useMySQL) {
  // Use MySQL for production - import the wrapper functions
  const mysqlDb = await import('./database-mysql.js');

  // Create a wrapper that mimics better-sqlite3 API but uses async
  db = {
    prepare: (sql) => ({
      run: async (...params) => {
        const result = await mysqlDb.run(sql, params);
        return result;
      },
      get: async (...params) => {
        const result = await mysqlDb.get(sql, params);
        return result;
      },
      all: async (...params) => {
        const result = await mysqlDb.all(sql, params);
        return result;
      }
    }),
    exec: async (sql) => {
      await mysqlDb.query(sql);
    },
    transaction: (fn) => {
      return async (...args) => {
        // Simplified transaction - just execute the function
        return await fn(...args);
      };
    }
  };
} else {
  // Use SQLite for local development
  const Database = (await import('better-sqlite3')).default;
  const sqliteDb = new Database(join(__dirname, 'draft.db'));
  sqliteDb.pragma('foreign_keys = ON');

  // Wrap SQLite to return Promises for consistency
  db = {
    prepare: (sql) => {
      const stmt = sqliteDb.prepare(sql);
      return {
        run: async (...params) => stmt.run(...params),
        get: async (...params) => stmt.get(...params),
        all: async (...params) => stmt.all(...params)
      };
    },
    exec: async (sql) => sqliteDb.exec(sql),
    transaction: (fn) => {
      const txn = sqliteDb.transaction(fn);
      return async (...args) => txn(...args);
    }
  };
}

export default db;
