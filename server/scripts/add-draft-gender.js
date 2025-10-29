import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../db/draft.db'));

console.log('Adding gender column to drafts table...');

try {
  // Add gender column to drafts table
  db.prepare(`
    ALTER TABLE drafts ADD COLUMN gender TEXT CHECK(gender IN ('M', 'F'))
  `).run();

  console.log('✅ Successfully added gender column to drafts table');

  // Show the updated schema
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='drafts'").get();
  console.log('\nUpdated drafts table schema:');
  console.log(schema.sql);

} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('⚠️  Gender column already exists');
  } else {
    console.error('❌ Error:', error.message);
    throw error;
  }
} finally {
  db.close();
}
