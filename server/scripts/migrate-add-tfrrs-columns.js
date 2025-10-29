import db from '../db/database.js';

console.log('Adding new columns to athletes table...');

try {
  // Add new columns to athletes table
  const columnsToAdd = [
    'ALTER TABLE athletes ADD COLUMN conference TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_6k TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_6k_seconds INTEGER',
    'ALTER TABLE athletes ADD COLUMN pr_8k TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_8k_seconds INTEGER',
    'ALTER TABLE athletes ADD COLUMN pr_10k TEXT',
    'ALTER TABLE athletes ADD COLUMN pr_10k_seconds INTEGER',
    'ALTER TABLE athletes ADD COLUMN season_best_seconds INTEGER',
    'ALTER TABLE athletes ADD COLUMN tfrrs_id TEXT',
    'ALTER TABLE athletes ADD COLUMN tfrrs_url TEXT',
    'ALTER TABLE athletes ADD COLUMN hometown TEXT',
    'ALTER TABLE athletes ADD COLUMN updated_at DATETIME'
  ];

  for (const sql of columnsToAdd) {
    try {
      db.exec(sql);
      console.log('✅ Added column:', sql.split('ADD COLUMN ')[1]);
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('⏭️  Column already exists:', sql.split('ADD COLUMN ')[1]);
      } else {
        console.error('❌ Error adding column:', err.message);
      }
    }
  }

  console.log('\n✅ Migration complete! Database is ready for TFRRS imports.');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
