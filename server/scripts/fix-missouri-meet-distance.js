import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../db/draft.db'));

console.log('Fixing Missouri Pre-National Invitational meet distances...\n');

// Get the meet info
const meet = db.prepare('SELECT * FROM meets WHERE id = 24').get();
console.log(`Meet: ${meet.name}`);
console.log(`Current distance: ${meet.distance}\n`);

// Count athletes by gender
const genderCounts = db.prepare(`
  SELECT a.gender, COUNT(*) as count
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  WHERE r.meet_id = 24
  GROUP BY a.gender
`).all();

console.log('Current athlete counts:');
genderCounts.forEach(row => {
  console.log(`  ${row.gender}: ${row.count} athletes`);
});

// Sample male times to confirm they're 8K
console.log('\nSample male athlete times (should be ~22-24 min for 8K):');
const maleSamples = db.prepare(`
  SELECT a.name, r.time
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  WHERE r.meet_id = 24 AND a.gender = 'M'
  LIMIT 5
`).all();
maleSamples.forEach(row => {
  console.log(`  ${row.name}: ${row.time}`);
});

console.log('\n' + '='.repeat(60));
console.log('PROPOSED FIX:');
console.log('='.repeat(60));
console.log('1. Create new meet "Missouri Pre-National - Men 8K"');
console.log('2. Move all male athletes to the new 8K meet');
console.log('3. Rename original meet to "Missouri Pre-National - Women 6K"');
console.log('4. Recalculate PRs for affected athletes');
console.log('='.repeat(60));

const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nApply this fix? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    try {
      db.transaction(() => {
        // Create new meet for men's 8K
        const result = db.prepare(`
          INSERT INTO meets (name, date, distance)
          VALUES (?, ?, ?)
        `).run('Missouri Pre-National Invitational - Men 8K', meet.date, '8K');

        const newMeetId = result.lastInsertRowid;
        console.log(`\n✓ Created new meet (ID ${newMeetId}): Missouri Pre-National - Men 8K`);

        // Move male athletes to new meet
        const moved = db.prepare(`
          UPDATE results
          SET meet_id = ?
          WHERE meet_id = 24
          AND athlete_id IN (SELECT id FROM athletes WHERE gender = 'M')
        `).run(newMeetId);

        console.log(`✓ Moved ${moved.changes} male athletes to new 8K meet`);

        // Rename original meet
        db.prepare(`
          UPDATE meets
          SET name = ?
          WHERE id = 24
        `).run('Missouri Pre-National Invitational - Women 6K');

        console.log(`✓ Renamed original meet to "Missouri Pre-National - Women 6K"`);

        console.log('\n✅ Fix applied successfully!');
        console.log('\nNext steps:');
        console.log('1. Recalculate athlete PRs (some 8K PRs may have changed)');
        console.log('2. Recalculate rankings');

      })();
    } catch (error) {
      console.error('❌ Error applying fix:', error);
    }
  } else {
    console.log('\nFix cancelled.');
  }

  db.close();
  rl.close();
  process.exit(0);
});
