// Script to migrate data from SQLite to MySQL
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MySQL connection
const mysqlConfig = {
  host: 'k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
  user: 'xfelkh3jgbfmibxt',
  password: 'gkxwa00z10e71bci',
  port: 3306,
  database: 'puwi2dasthtgdauv'
};

// SQLite connection
const sqliteDb = new Database(join(__dirname, '../db/draft.db'));

async function migrateData() {
  let connection;

  try {
    console.log('🔄 Starting data migration from SQLite to MySQL...\n');

    // Connect to MySQL
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL');

    // Get SQLite data
    console.log('\n📊 Reading data from SQLite...');
    const athletes = sqliteDb.prepare('SELECT * FROM athletes').all();
    const teams = sqliteDb.prepare('SELECT * FROM teams').all();
    const drafts = sqliteDb.prepare('SELECT * FROM drafts').all();
    const meets = sqliteDb.prepare('SELECT * FROM meets').all();
    const results = sqliteDb.prepare('SELECT * FROM results').all();

    console.log(`  - Athletes: ${athletes.length}`);
    console.log(`  - Teams: ${teams.length}`);
    console.log(`  - Drafts: ${drafts.length}`);
    console.log(`  - Meets: ${meets.length}`);
    console.log(`  - Results: ${results.length}`);

    // Migrate athletes
    if (athletes.length > 0) {
      console.log('\n👥 Migrating athletes...');
      for (const athlete of athletes) {
        // Convert undefined to null for MySQL
        const values = [
          athlete.id, athlete.name, athlete.school, athlete.grade ?? null, athlete.gender ?? null, athlete.conference ?? null,
          athlete.pr_5k ?? null, athlete.pr_5k_seconds ?? null, athlete.pr_5k_meet_name ?? null, athlete.pr_5k_meet_date ?? null,
          athlete.pr_6k ?? null, athlete.pr_6k_seconds ?? null, athlete.pr_6k_meet_name ?? null, athlete.pr_6k_meet_date ?? null,
          athlete.pr_8k ?? null, athlete.pr_8k_seconds ?? null, athlete.pr_8k_meet_name ?? null, athlete.pr_8k_meet_date ?? null,
          athlete.pr_10k ?? null, athlete.pr_10k_seconds ?? null, athlete.pr_10k_meet_name ?? null, athlete.pr_10k_meet_date ?? null,
          athlete.season_best ?? null, athlete.season_best_seconds ?? null, athlete.ranking ?? null, athlete.tfrrs_id ?? null,
          athlete.tfrrs_url ?? null, athlete.hometown ?? null, athlete.drafted_team_id ?? null,
          athlete.created_at ?? null, athlete.updated_at ?? null
        ];

        await connection.execute(
          `INSERT INTO athletes (id, name, school, grade, gender, conference,
           pr_5k, pr_5k_seconds, pr_5k_meet_name, pr_5k_meet_date,
           pr_6k, pr_6k_seconds, pr_6k_meet_name, pr_6k_meet_date,
           pr_8k, pr_8k_seconds, pr_8k_meet_name, pr_8k_meet_date,
           pr_10k, pr_10k_seconds, pr_10k_meet_name, pr_10k_meet_date,
           season_best, season_best_seconds, ranking, tfrrs_id, tfrrs_url, hometown,
           drafted_team_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          values
        );
      }
      console.log(`✅ Migrated ${athletes.length} athletes`);
    }

    // Migrate drafts
    if (drafts.length > 0) {
      console.log('\n📝 Migrating drafts...');
      for (const draft of drafts) {
        await connection.execute(
          `INSERT INTO drafts (id, name, status, current_round, current_pick, total_rounds,
           snake_draft, created_at, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [
            draft.id, draft.name, draft.status ?? null, draft.current_round ?? null, draft.current_pick ?? null,
            draft.total_rounds ?? null, draft.snake_draft ?? null, draft.created_at ?? null,
            draft.started_at ?? null, draft.completed_at ?? null
          ]
        );
      }
      console.log(`✅ Migrated ${drafts.length} drafts`);
    }

    // Migrate teams
    if (teams.length > 0) {
      console.log('\n🏆 Migrating teams...');
      for (const team of teams) {
        await connection.execute(
          `INSERT INTO teams (id, name, owner_name, draft_id, logo_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [team.id, team.name, team.owner_name, team.draft_id ?? null, team.logo_url ?? null, team.created_at ?? null]
        );
      }
      console.log(`✅ Migrated ${teams.length} teams`);
    }

    // Migrate meets
    if (meets.length > 0) {
      console.log('\n🏃 Migrating meets...');
      for (const meet of meets) {
        await connection.execute(
          `INSERT INTO meets (id, name, date, location, distance, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [meet.id, meet.name, meet.date, meet.location ?? null, meet.distance ?? null,
           meet.status ?? null, meet.created_at ?? null]
        );
      }
      console.log(`✅ Migrated ${meets.length} meets`);
    }

    // Migrate results
    if (results.length > 0) {
      console.log('\n📊 Migrating results...');
      for (const result of results) {
        await connection.execute(
          `INSERT INTO results (id, meet_id, athlete_id, place, time, time_seconds, points, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE place = VALUES(place)`,
          [result.id, result.meet_id, result.athlete_id, result.place ?? null, result.time,
           result.time_seconds, result.points ?? null, result.created_at ?? null]
        );
      }
      console.log(`✅ Migrated ${results.length} results`);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    sqliteDb.close();
  }
}

migrateData();
