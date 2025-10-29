import db from './db/database.js';

console.log('\n=== Deleting Athletes Without Grades ===\n');

// Get count of athletes without grades
const athletesWithoutGrade = db.prepare(`
  SELECT id, name, school
  FROM athletes
  WHERE grade IS NULL OR grade = ''
`).all();

console.log(`Found ${athletesWithoutGrade.length} athletes without grades\n`);

if (athletesWithoutGrade.length === 0) {
  console.log('No athletes without grades found. All athletes have grade information!');
  db.close();
  process.exit(0);
}

// Sample athletes to be deleted
console.log('Sample athletes to delete:');
athletesWithoutGrade.slice(0, 20).forEach(a => {
  console.log(`  ${a.name} (${a.school})`);
});
if (athletesWithoutGrade.length > 20) {
  console.log(`  ... and ${athletesWithoutGrade.length - 20} more`);
}

console.log('\n⚠️  This will delete these athletes and their results/picks!');
console.log('Type "yes" to confirm or "no" to cancel...\n');

// Wait for user confirmation
process.stdin.once('data', (data) => {
  const answer = data.toString().trim().toLowerCase();

  if (answer !== 'yes') {
    console.log('Cancelled. No athletes deleted.');
    db.close();
    process.exit(0);
  }

  // Proceed with deletion
  const ids = athletesWithoutGrade.map(a => a.id);
  const placeholders = ids.map(() => '?').join(',');

  // Use transaction to ensure all deletions happen atomically
  const deleteTransaction = db.transaction(() => {
    // Delete related data first
    db.prepare(`DELETE FROM results WHERE athlete_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM draft_picks WHERE athlete_id IN (${placeholders})`).run(...ids);

    // Delete athletes
    const result = db.prepare(`DELETE FROM athletes WHERE grade IS NULL OR grade = ''`).run();
    return result.changes;
  });

  const deletedCount = deleteTransaction();

  console.log(`\n✅ Deleted ${deletedCount} athletes without grades`);
  console.log('✅ All college athletes with grades have been preserved\n');

  db.close();
});
