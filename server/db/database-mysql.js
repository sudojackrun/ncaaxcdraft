import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

// Parse JAWSDB_URL from Heroku or use individual env variables
function getDatabaseConfig() {
  if (process.env.JAWSDB_URL) {
    // Parse JawsDB URL format: mysql://username:password@host:port/database
    const url = new URL(process.env.JAWSDB_URL);
    return {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      port: url.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDatabaseConfig());
  }
  return pool;
}

// Wrapper functions to make MySQL work similarly to better-sqlite3

export async function query(sql, params = []) {
  const connection = getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function run(sql, params = []) {
  const connection = getPool();
  const [result] = await connection.execute(sql, params);
  return {
    lastInsertRowid: result.insertId,
    changes: result.affectedRows
  };
}

export async function get(sql, params = []) {
  const connection = getPool();
  const [rows] = await connection.execute(sql, params);
  return rows[0] || null;
}

export async function all(sql, params = []) {
  const connection = getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export function prepare(sql) {
  return {
    run: async (...params) => run(sql, params),
    get: async (...params) => get(sql, params),
    all: async (...params) => all(sql, params)
  };
}

export default {
  query,
  run,
  get,
  all,
  prepare
};
