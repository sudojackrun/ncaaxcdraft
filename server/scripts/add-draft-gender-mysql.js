// Script to add gender column to drafts table in MySQL
import dotenv from 'dotenv';
dotenv.config();

// Force MySQL connection
process.env.JAWSDB_URL = process.env.JAWSDB_URL || 'mysql://xfelkh3jgbfmibxt:gkxwa00z10e71bci@k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/puwi2dasthtgdauv';

async function addGenderColumn() {
  try {
    const { query } = await import('../db/database-mysql.js');

    console.log('🔄 Adding gender column to drafts table...');

    // Check if column already exists
    const [columns] = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'puwi2dasthtgdauv'
        AND TABLE_NAME = 'drafts'
        AND COLUMN_NAME = 'gender'
    `);

    if (columns && columns.length > 0) {
      console.log('✅ Gender column already exists in drafts table');
    } else {
      // Add the gender column
      await query(`
        ALTER TABLE drafts
        ADD COLUMN gender ENUM('M', 'F') AFTER snake_draft
      `);
      console.log('✅ Gender column added successfully to drafts table');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding gender column:', error);
    process.exit(1);
  }
}

addGenderColumn();
