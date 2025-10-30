import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const { draftId } = req.query;
    let query = 'SELECT * FROM teams';
    const params = [];

    if (draftId) {
      query += ' WHERE draft_id = ?';
      params.push(draftId);
    }

    const teams = await db.prepare(query).all(...params);
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single team with roster
router.get('/:id', async (req, res) => {
  try {
    const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    console.log(`Fetching roster for team ${req.params.id}...`);

    // Get team's drafted athletes
    const roster = await db.prepare(`
      SELECT a.*, dp.round, dp.pick_number, dp.overall_pick
      FROM athletes a
      JOIN draft_picks dp ON a.id = dp.athlete_id
      WHERE dp.team_id = ?
      ORDER BY dp.overall_pick ASC
    `).all(req.params.id);

    console.log(`Found ${roster.length} athletes on roster`);

    // For each athlete, get all their race results
    const rosterWithResults = await Promise.all(roster.map(async athlete => {
      try {
        const results = await db.prepare(`
          SELECT r.*, m.name as meet_name, m.date as meet_date, m.distance
          FROM results r
          JOIN meets m ON r.meet_id = m.id
          WHERE r.athlete_id = ?
          ORDER BY m.date DESC, r.time_seconds ASC
        `).all(athlete.id);

        console.log(`Athlete ${athlete.name} (${athlete.gender}): ${results.length} results found`);
        if (results.length > 0) {
          const distances = results.map(r => r.distance || 'NULL').join(', ');
          console.log(`  Distances: ${distances}`);
        }

        // Group results by distance
        const resultsByDistance = {
          '5K': [],
          '6K': [],
          '8K': [],
          '10K': []
        };

        results.forEach(result => {
          const distance = result.distance || '5K';
          if (resultsByDistance[distance]) {
            resultsByDistance[distance].push({
              time: result.time,
              time_seconds: result.time_seconds,
              meet_name: result.meet_name,
              meet_date: result.meet_date,
              place: result.place,
              points: result.points
            });
          } else {
            console.log(`  Warning: Unrecognized distance "${distance}" for result at ${result.meet_name}`);
          }
        });

        return {
          ...athlete,
          allResults: resultsByDistance
        };
      } catch (err) {
        console.error(`Error processing athlete ${athlete.id}:`, err);
        // Return athlete without results if there's an error
        return {
          ...athlete,
          allResults: { '5K': [], '6K': [], '8K': [], '10K': [] }
        };
      }
    }));

    console.log(`Returning ${rosterWithResults.length} athletes with results`);
    res.json({ ...team, roster: rosterWithResults });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { name, owner_name, draft_id } = req.body;

    const result = await db.prepare(`
      INSERT INTO teams (name, owner_name, draft_id)
      VALUES (?, ?, ?)
    `).run(name, owner_name, draft_id);

    const newTeam = await db.prepare('SELECT * FROM teams WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team standings for a draft
router.get('/standings/:draftId', async (req, res) => {
  try {
    const standings = await db.prepare(`
      SELECT
        t.id,
        t.name,
        t.owner_name,
        COALESCE(SUM(ts.total_points), 0) as total_points,
        COUNT(DISTINCT ts.meet_id) as meets_scored
      FROM teams t
      LEFT JOIN team_scores ts ON t.id = ts.team_id
      WHERE t.draft_id = ?
      GROUP BY t.id
      ORDER BY total_points DESC
    `).all(req.params.draftId);

    res.json(standings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
