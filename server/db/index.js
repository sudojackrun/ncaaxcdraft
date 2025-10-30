// Unified database interface that works with both SQLite and MySQL
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || process.env.JAWSDB_URL;

let dbInterface;

if (isProduction) {
  // Use MySQL for production
  const mysqlDb = await import('./database-mysql.js');

  dbInterface = {
    // Prepared statement that returns an object with run, get, all methods
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

    // Direct query methods
    exec: async (sql) => {
      // MySQL doesn't have exec, so we'll use query
      await mysqlDb.query(sql);
    },

    // Transaction support (simplified for MySQL)
    transaction: (fn) => {
      return async (...args) => {
        // For now, we'll just execute the function
        // Full transaction support would require connection handling
        return await fn(...args);
      };
    }
  };
} else {
  // Use SQLite for local development
  const sqliteDb = (await import('./database.js')).default;

  // Wrap SQLite synchronous methods to be async-compatible
  dbInterface = {
    prepare: (sql) => {
      const stmt = sqliteDb.prepare(sql);
      return {
        run: async (...params) => {
          return stmt.run(...params);
        },
        get: async (...params) => {
          return stmt.get(...params);
        },
        all: async (...params) => {
          return stmt.all(...params);
        }
      };
    },

    exec: async (sql) => {
      return sqliteDb.exec(sql);
    },

    transaction: (fn) => {
      const txn = sqliteDb.transaction(fn);
      return async (...args) => {
        return txn(...args);
      };
    }
  };
}

export default dbInterface;
