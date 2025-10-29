import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'db/draft.db'));

console.log('\n=== Database Stats ===');
const totalAthletes = db.prepare('SELECT COUNT(*) as count FROM athletes').get();
console.log('Total Athletes:', totalAthletes.count);

const athletesWithResults = db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM results').get();
console.log('Athletes with Results:', athletesWithResults.count);

const athletesWithPicks = db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM draft_picks').get();
console.log('Athletes with Draft Picks:', athletesWithPicks.count);

const athletesWithDraftedTeamId = db.prepare('SELECT COUNT(*) as count FROM athletes WHERE drafted_team_id IS NOT NULL AND drafted_team_id != 0').get();
console.log('Athletes with drafted_team_id:', athletesWithDraftedTeamId.count);

console.log('\n=== Sample Athletes ===');
const sampleAthletes = db.prepare('SELECT id, name, school, drafted_team_id, (SELECT COUNT(*) FROM results WHERE athlete_id = athletes.id) as result_count, (SELECT COUNT(*) FROM draft_picks WHERE athlete_id = athletes.id) as pick_count FROM athletes LIMIT 10').all();
sampleAthletes.forEach(a => {
  console.log(`ID ${a.id}: ${a.name} (${a.school}) - Results: ${a.result_count}, Picks: ${a.pick_count}, TeamID: ${a.drafted_team_id}`);
});

console.log('\n=== Potentially Orphaned Athletes ===');
const orphaned = db.prepare(`
  SELECT a.id, a.name, a.school, a.drafted_team_id
  FROM athletes a
  WHERE a.id NOT IN (SELECT DISTINCT athlete_id FROM results WHERE athlete_id IS NOT NULL)
  AND a.id NOT IN (SELECT DISTINCT athlete_id FROM draft_picks WHERE athlete_id IS NOT NULL)
  AND (a.drafted_team_id IS NULL OR a.drafted_team_id = 0)
  LIMIT 20
`).all();
console.log(`Found ${orphaned.length} orphaned athletes:`);
orphaned.forEach(a => {
  console.log(`- ID ${a.id}: ${a.name} (${a.school})`);
});

db.close();
