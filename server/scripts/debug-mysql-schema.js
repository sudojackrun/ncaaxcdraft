// Debug script to test MySQL schema creation directly
import dotenv from 'dotenv';
dotenv.config();

process.env.JAWSDB_URL = 'mysql://xfelkh3jgbfmibxt:gkxwa00z10e71bci@k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/puwi2dasthtgdauv';

async function testSchema() {
  try {
    console.log('Testing MySQL schema creation directly...');

    // Import MySQL schema functions directly
    const { initializeSchema } = await import('../db/schema-mysql.js');

    await initializeSchema();

    // Check what was created
    const { query } = await import('../db/database-mysql.js');
    const tables = await query('SHOW TABLES');
    console.log('Created tables:', tables);

    // Show table count
    console.log(`Total tables created: ${tables.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSchema();
