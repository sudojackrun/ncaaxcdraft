import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all meets
router.get('/', async (req, res) => {
  try {
    const meets = await db.prepare('SELECT * FROM meets ORDER BY date DESC').all();
    res.json(meets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single meet with results
router.get('/:id', async (req, res) => {
  try {
    const meet = await db.prepare('SELECT * FROM meets WHERE id = ?').get(req.params.id);
    if (!meet) {
      return res.status(404).json({ error: 'Meet not found' });
    }

    const results = await db.prepare(`
      SELECT r.*, a.name, a.school, a.gender, a.grade
      FROM results r
      JOIN athletes a ON r.athlete_id = a.id
      WHERE r.meet_id = ?
      ORDER BY r.place ASC
    `).all(req.params.id);

    res.json({ ...meet, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new meet
router.post('/', async (req, res) => {
  try {
    const { name, date, location, distance = '5K' } = req.body;

    const result = await db.prepare(`
      INSERT INTO meets (name, date, location, distance)
      VALUES (?, ?, ?, ?)
    `).run(name, date, location, distance);

    const newMeet = await db.prepare('SELECT * FROM meets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newMeet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add result to meet
router.post('/:id/results', async (req, res) => {
  try {
    const { athlete_id, place, time, time_seconds } = req.body;

    const result = await db.prepare(`
      INSERT INTO results (meet_id, athlete_id, place, time, time_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, athlete_id, place, time, time_seconds);

    const newResult = await db.prepare(`
      SELECT r.*, a.name, a.school
      FROM results r
      JOIN athletes a ON r.athlete_id = a.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate team scores for a meet
router.post('/:meetId/calculate-scores/:draftId', async (req, res) => {
  try {
    const { meetId, draftId } = req.params;

    // Get all teams in this draft
    const teams = await db.prepare('SELECT * FROM teams WHERE draft_id = ?').all(draftId);

    const calculateTeamScore = db.prepare(`
      SELECT
        dp.team_id,
        SUM(r.place) as total_points,
        COUNT(r.id) as runners_scored
      FROM draft_picks dp
      JOIN results r ON dp.athlete_id = r.athlete_id
      WHERE dp.draft_id = ? AND r.meet_id = ?
      GROUP BY dp.team_id
    `);

    // Clear existing scores
    await db.prepare('DELETE FROM team_scores WHERE meet_id = ?').run(meetId);

    const insertScore = db.prepare(`
      INSERT INTO team_scores (team_id, meet_id, total_points)
      VALUES (?, ?, ?)
    `);

    for (const team of teams) {
      const score = await calculateTeamScore.get(draftId, meetId);
      const points = score && score.team_id === team.id ? score.total_points : 0;
      await insertScore.run(team.id, meetId, points);
    }

    // Get updated scores
    const scores = await db.prepare(`
      SELECT ts.*, t.name as team_name, t.owner_name
      FROM team_scores ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.meet_id = ?
      ORDER BY ts.total_points ASC
    `).all(meetId);

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team scores for a meet
router.get('/:meetId/scores/:draftId', async (req, res) => {
  try {
    const scores = await db.prepare(`
      SELECT
        ts.*,
        t.name as team_name,
        t.owner_name
      FROM team_scores ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.meet_id = ? AND t.draft_id = ?
      ORDER BY ts.total_points ASC
    `).all(req.params.meetId, req.params.draftId);

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload results
router.post('/:id/results/bulk', async (req, res) => {
  try {
    const { results } = req.body; // Array of { athlete_id, place, time, time_seconds }

    const insertResult = db.prepare(`
      INSERT INTO results (meet_id, athlete_id, place, time, time_seconds)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((meetId, resultsList) => {
      resultsList.forEach(r => {
        insertResult.run(meetId, r.athlete_id, r.place, r.time, r.time_seconds);
      });
    });

    await transaction(req.params.id, results);

    res.json({ message: `${results.length} results added successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single meet
router.delete('/:id', async (req, res) => {
  try {
    const meet = await db.prepare('SELECT * FROM meets WHERE id = ?').get(req.params.id);
    if (!meet) {
      return res.status(404).json({ error: 'Meet not found' });
    }

    // Use a transaction to ensure all deletions happen atomically
    const deleteTransaction = db.transaction(() => {
      // Delete related results first (foreign key)
      db.prepare('DELETE FROM results WHERE meet_id = ?').run(req.params.id);

      // Delete related team scores
      db.prepare('DELETE FROM team_scores WHERE meet_id = ?').run(req.params.id);

      // Delete the meet
      db.prepare('DELETE FROM meets WHERE id = ?').run(req.params.id);

      // Delete orphaned athletes (athletes with no results and not drafted)
      // Use LEFT JOIN approach which handles empty tables correctly
      const orphanedAthletes = db.prepare(`
        DELETE FROM athletes
        WHERE id IN (
          SELECT a.id
          FROM athletes a
          LEFT JOIN results r ON a.id = r.athlete_id
          LEFT JOIN draft_picks dp ON a.id = dp.athlete_id
          WHERE r.athlete_id IS NULL
          AND dp.athlete_id IS NULL
          AND (a.drafted_team_id IS NULL OR a.drafted_team_id = 0)
        )
      `).run();

      return orphanedAthletes.changes;
    });

    const orphanedCount = await deleteTransaction();

    res.json({
      message: 'Meet deleted successfully',
      meet,
      orphanedAthletesRemoved: orphanedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all meets
router.delete('/', async (req, res) => {
  try {
    const meets = await db.prepare('SELECT id FROM meets').all();
    const meetIds = meets.map(m => m.id);

    if (meetIds.length === 0) {
      return res.json({ message: 'No meets to delete', count: 0, orphanedAthletesRemoved: 0 });
    }

    // Use a transaction to ensure all deletions happen atomically
    const deleteTransaction = db.transaction(() => {
      // Delete all related data
      const placeholders = meetIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM results WHERE meet_id IN (${placeholders})`).run(...meetIds);
      db.prepare(`DELETE FROM team_scores WHERE meet_id IN (${placeholders})`).run(...meetIds);

      // Delete all meets
      db.prepare('DELETE FROM meets').run();

      // Delete orphaned athletes (athletes with no results and not drafted)
      // Use LEFT JOIN approach which handles empty tables correctly
      const orphanedAthletes = db.prepare(`
        DELETE FROM athletes
        WHERE id IN (
          SELECT a.id
          FROM athletes a
          LEFT JOIN results r ON a.id = r.athlete_id
          LEFT JOIN draft_picks dp ON a.id = dp.athlete_id
          WHERE r.athlete_id IS NULL
          AND dp.athlete_id IS NULL
          AND (a.drafted_team_id IS NULL OR a.drafted_team_id = 0)
        )
      `).run();

      return orphanedAthletes.changes;
    });

    const orphanedCount = await deleteTransaction();

    res.json({
      message: `Deleted ${meetIds.length} meets successfully`,
      count: meetIds.length,
      orphanedAthletesRemoved: orphanedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Get orphaned athletes info (without deleting)
router.get('/orphaned-athletes-info', async (req, res) => {
  try {
    // Get counts
    const totalAthletes = await db.prepare('SELECT COUNT(*) as count FROM athletes').get();
    const athletesWithResults = await db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM results').get();
    const athletesWithPicks = await db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM draft_picks').get();
    const athletesWithDraftedTeamId = await db.prepare('SELECT COUNT(*) as count FROM athletes WHERE drafted_team_id IS NOT NULL').get();

    // Get potentially orphaned athletes
    const orphaned = await db.prepare(`
      SELECT a.id, a.name, a.school, a.drafted_team_id,
        (SELECT COUNT(*) FROM results WHERE athlete_id = a.id) as result_count,
        (SELECT COUNT(*) FROM draft_picks WHERE athlete_id = a.id) as pick_count
      FROM athletes a
      LEFT JOIN results r ON a.id = r.athlete_id
      LEFT JOIN draft_picks dp ON a.id = dp.athlete_id
      WHERE r.athlete_id IS NULL
      AND dp.athlete_id IS NULL
      AND (a.drafted_team_id IS NULL OR a.drafted_team_id = 0)
    `).all();

    res.json({
      totalAthletes: totalAthletes.count,
      athletesWithResults: athletesWithResults.count,
      athletesWithPicks: athletesWithPicks.count,
      athletesWithDraftedTeamId: athletesWithDraftedTeamId.count,
      orphanedAthletes: orphaned
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up orphaned results (results pointing to non-existent meets)
router.post('/cleanup-results', async (req, res) => {
  try {
    console.log('\n=== Cleanup Orphaned Results ===');

    // Find results pointing to non-existent meets
    const orphanedResults = await db.prepare(`
      DELETE FROM results
      WHERE meet_id NOT IN (SELECT id FROM meets)
    `).run();

    console.log(`Deleted ${orphanedResults.changes} orphaned results`);

    res.json({
      message: `Cleaned up ${orphanedResults.changes} orphaned result(s) from deleted meets`,
      count: orphanedResults.changes
    });
  } catch (error) {
    console.error('Error cleaning up results:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Clean up orphaned athletes (standalone endpoint)
router.post('/cleanup-athletes', async (req, res) => {
  try {
    console.log('\n=== Cleanup Athletes Debug ===');

    // Get counts for debugging
    const totalAthletes = await db.prepare('SELECT COUNT(*) as count FROM athletes').get();
    const athletesWithResults = await db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM results').get();
    const athletesWithPicks = await db.prepare('SELECT COUNT(DISTINCT athlete_id) as count FROM draft_picks').get();
    const totalMeets = await db.prepare('SELECT COUNT(*) as count FROM meets').get();
    const totalResults = await db.prepare('SELECT COUNT(*) as count FROM results').get();
    const totalPicks = await db.prepare('SELECT COUNT(*) as count FROM draft_picks').get();

    console.log(`Total athletes: ${totalAthletes.count}`);
    console.log(`Athletes with results: ${athletesWithResults.count}`);
    console.log(`Athletes with picks: ${athletesWithPicks.count}`);
    console.log(`Total meets: ${totalMeets.count}`);
    console.log(`Total results: ${totalResults.count}`);
    console.log(`Total picks: ${totalPicks.count}`);

    // Show sample athletes with their connections
    const sampleAthletes = await db.prepare(`
      SELECT
        a.id,
        a.name,
        a.school,
        (SELECT COUNT(*) FROM results WHERE athlete_id = a.id) as result_count,
        (SELECT COUNT(*) FROM draft_picks WHERE athlete_id = a.id) as pick_count
      FROM athletes a
      LIMIT 5
    `).all();

    console.log('\nSample athletes:');
    sampleAthletes.forEach(a => {
      console.log(`  ${a.name} (${a.school}): ${a.result_count} results, ${a.pick_count} picks`);
    });

    // Find orphaned athletes first (simpler query)
    const orphanedList = await db.prepare(`
      SELECT id, name, school
      FROM athletes
      WHERE id NOT IN (SELECT DISTINCT athlete_id FROM results WHERE athlete_id IS NOT NULL)
      AND id NOT IN (SELECT DISTINCT athlete_id FROM draft_picks WHERE athlete_id IS NOT NULL)
    `).all();

    console.log(`\nFound ${orphanedList.length} orphaned athletes`);

    if (orphanedList.length === 0) {
      const message = `No orphaned athletes found.\n\nDatabase stats:\n- Total athletes: ${totalAthletes.count}\n- Athletes with results: ${athletesWithResults.count}\n- Athletes with draft picks: ${athletesWithPicks.count}\n\nAll athletes are either in meets or drafted.`;
      console.log(message);
      return res.json({
        message: message,
        count: 0,
        stats: {
          totalAthletes: totalAthletes.count,
          athletesWithResults: athletesWithResults.count,
          athletesWithPicks: athletesWithPicks.count,
          totalMeets: totalMeets.count,
          totalResults: totalResults.count,
          totalPicks: totalPicks.count
        }
      });
    }

    console.log('Orphaned athletes to delete:');
    orphanedList.slice(0, 10).forEach(a => {
      console.log(`  - ${a.name} (${a.school})`);
    });

    // Delete them
    const orphanedAthletes = await db.prepare(`
      DELETE FROM athletes
      WHERE id NOT IN (SELECT DISTINCT athlete_id FROM results WHERE athlete_id IS NOT NULL)
      AND id NOT IN (SELECT DISTINCT athlete_id FROM draft_picks WHERE athlete_id IS NOT NULL)
    `).run();

    console.log(`\nDeleted ${orphanedAthletes.changes} athletes`);

    res.json({
      message: `Cleaned up ${orphanedAthletes.changes} orphaned athlete(s)`,
      count: orphanedAthletes.changes,
      athletesDeleted: orphanedList.slice(0, 10).map(a => `${a.name} (${a.school})`)
    });
  } catch (error) {
    console.error('Error cleaning up athletes:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

export default router;
