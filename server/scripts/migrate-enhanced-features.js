import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../db/draft.db');

const db = new Database(dbPath);

// Temporarily disable foreign key constraints for migration
db.pragma('foreign_keys = OFF');

console.log('Starting enhanced features migration...');

try {
  // 1. Add PR meet information columns for each distance
  const prColumns = [
    // 5K PR meet info
    'ALTER TABLE athletes ADD COLUMN pr_5k_meet_name TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_5k_meet_date TEXT',

    // 6K PR meet info
    'ALTER TABLE athletes ADD COLUMN pr_6k_meet_name TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_6k_meet_date TEXT',

    // 8K PR meet info
    'ALTER TABLE athletes ADD COLUMN pr_8k_meet_name TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_8k_meet_date TEXT',

    // 10K PR meet info
    'ALTER TABLE athletes ADD COLUMN pr_10k_meet_name TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_10k_meet_date TEXT',
  ];

  for (const sql of prColumns) {
    try {
      db.prepare(sql).run();
      console.log(`✓ ${sql.split('ADD COLUMN ')[1].split(' ')[0]} added`);
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`⊘ Column already exists: ${sql.split('ADD COLUMN ')[1].split(' ')[0]}`);
      } else {
        throw err;
      }
    }
  }

  // 2. Add team assignment column (which draft team owns this athlete)
  try {
    db.prepare('ALTER TABLE athletes ADD COLUMN drafted_team_id INTEGER REFERENCES teams(id)').run();
    console.log('✓ drafted_team_id column added');
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('⊘ drafted_team_id already exists');
    } else {
      throw err;
    }
  }

  // 3. Add team logo column
  try {
    db.prepare('ALTER TABLE teams ADD COLUMN logo_url TEXT').run();
    console.log('✓ logo_url column added to teams');
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('⊘ logo_url already exists in teams');
    } else {
      throw err;
    }
  }

  // 4. Migrate grade from INTEGER to TEXT (FR, SO, JR, SR)
  console.log('\n📝 Converting grade column from numbers to college year strings...');

  // Check current grade column type
  const tableInfo = db.prepare('PRAGMA table_info(athletes)').all();
  const gradeColumn = tableInfo.find(col => col.name === 'grade');

  if (gradeColumn && gradeColumn.type === 'INTEGER') {
    console.log('Grade column is INTEGER, converting to TEXT...');

    // SQLite doesn't support ALTER COLUMN TYPE, so we need to:
    // 1. Create new column
    // 2. Copy data with conversion
    // 3. Drop old column
    // 4. Rename new column

    try {
      db.prepare('ALTER TABLE athletes ADD COLUMN grade_text TEXT').run();
      console.log('✓ Created temporary grade_text column');
    } catch (err) {
      if (!err.message.includes('duplicate column name')) throw err;
    }

    // Convert existing data
    db.prepare(`
      UPDATE athletes
      SET grade_text = CASE grade
        WHEN 9 THEN 'FR'
        WHEN 10 THEN 'SO'
        WHEN 11 THEN 'JR'
        WHEN 12 THEN 'SR'
        ELSE NULL
      END
      WHERE grade IS NOT NULL
    `).run();
    console.log('✓ Converted existing grade values');

    // Drop athletes_new if it exists from previous failed migration
    try {
      db.prepare('DROP TABLE IF EXISTS athletes_new').run();
      console.log('✓ Cleaned up previous migration attempt');
    } catch (err) {
      // Ignore errors
    }

    // Create a new table with the correct schema
    db.prepare(`
      CREATE TABLE athletes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        grade TEXT,
        gender TEXT CHECK(gender IN ('M', 'F')),
        conference TEXT,
        pr_5k TEXT,
        pr_5k_seconds INTEGER,
        pr_5k_meet_name TEXT,
        pr_5k_meet_date TEXT,
        pr_6k TEXT,
        pr_6k_seconds INTEGER,
        pr_6k_meet_name TEXT,
        pr_6k_meet_date TEXT,
        pr_8k TEXT,
        pr_8k_seconds INTEGER,
        pr_8k_meet_name TEXT,
        pr_8k_meet_date TEXT,
        pr_10k TEXT,
        pr_10k_seconds INTEGER,
        pr_10k_meet_name TEXT,
        pr_10k_meet_date TEXT,
        tfrrs_id TEXT,
        tfrrs_url TEXT,
        hometown TEXT,
        drafted_team_id INTEGER REFERENCES teams(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    console.log('✓ Created new athletes table with TEXT grade');

    // Copy all data
    db.prepare(`
      INSERT INTO athletes_new
      SELECT
        id, name, school, grade_text, gender, conference,
        pr_5k, pr_5k_seconds, pr_5k_meet_name, pr_5k_meet_date,
        pr_6k, pr_6k_seconds, pr_6k_meet_name, pr_6k_meet_date,
        pr_8k, pr_8k_seconds, pr_8k_meet_name, pr_8k_meet_date,
        pr_10k, pr_10k_seconds, pr_10k_meet_name, pr_10k_meet_date,
        tfrrs_id, tfrrs_url, hometown, drafted_team_id,
        created_at, updated_at
      FROM athletes
    `).run();
    console.log('✓ Copied all data to new table');

    // Drop old table and rename new one
    db.prepare('DROP TABLE athletes').run();
    db.prepare('ALTER TABLE athletes_new RENAME TO athletes').run();
    console.log('✓ Replaced old athletes table');

  } else if (gradeColumn && gradeColumn.type === 'TEXT') {
    console.log('⊘ Grade column is already TEXT type');
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\nNew features added:');
  console.log('  • PR meet name and date for each distance (5K, 6K, 8K, 10K)');
  console.log('  • Grade as college year (FR, SO, JR, SR)');
  console.log('  • Team assignment tracking (drafted_team_id)');
  console.log('  • Team logo support (logo_url)');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.pragma('foreign_keys = ON');
  db.close();
  process.exit(1);
} finally {
  // Re-enable foreign key constraints
  db.pragma('foreign_keys = ON');
  db.close();
  console.log('\n🔒 Foreign key constraints re-enabled');
}
