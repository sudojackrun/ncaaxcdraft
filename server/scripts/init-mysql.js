// Script to initialize MySQL database with schema
import dotenv from 'dotenv';
dotenv.config();

// Set environment to production to use MySQL
process.env.JAWSDB_URL = 'mysql://xfelkh3jgbfmibxt:gkxwa00z10e71bci@k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/puwi2dasthtgdauv';

// Import and run schema initialization
import { initializeSchema } from '../db/schema.js';

async function initMySQL() {
  try {
    console.log('🔧 Initializing MySQL schema...');
    await initializeSchema();
    console.log('✅ MySQL database initialized successfully!');

    // Test by checking tables
    const { query } = await import('../db/database-mysql.js');
    const tables = await query('SHOW TABLES');
    console.log('📊 Created tables:', tables);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing MySQL:', error);
    process.exit(1);
  }
}

initMySQL();
