import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all athletes
router.get('/', (req, res) => {
  try {
    const { gender, available, draftId } = req.query;

    let query = 'SELECT * FROM athletes';
    const params = [];

    if (gender) {
      query += ' WHERE gender = ?';
      params.push(gender);
    }

    // Filter out already drafted athletes if draftId provided
    if (available === 'true' && draftId) {
      query += (params.length > 0 ? ' AND' : ' WHERE') +
        ' id NOT IN (SELECT athlete_id FROM draft_picks WHERE draft_id = ?)';
      params.push(draftId);
    }

    query += ' ORDER BY name ASC';

    const athletes = db.prepare(query).all(...params);
    res.json(athletes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single athlete
router.get('/:id', (req, res) => {
  try {
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    res.json(athlete);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new athlete
router.post('/', (req, res) => {
  try {
    const { name, school, grade, gender, pr_5k, pr_5k_seconds } = req.body;

    const result = db.prepare(`
      INSERT INTO athletes (name, school, grade, gender, pr_5k, pr_5k_seconds)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, school, grade, gender, pr_5k, pr_5k_seconds);

    const newAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newAthlete);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update athlete
router.put('/:id', (req, res) => {
  try {
    const { name, school, grade, gender, pr_5k, pr_5k_seconds } = req.body;

    db.prepare(`
      UPDATE athletes
      SET name = ?, school = ?, grade = ?, gender = ?, pr_5k = ?, pr_5k_seconds = ?
      WHERE id = ?
    `).run(name, school, grade, gender, pr_5k, pr_5k_seconds, req.params.id);

    const updatedAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    res.json(updatedAthlete);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search athletes
router.get('/search/:query', (req, res) => {
  try {
    const athletes = db.prepare(`
      SELECT * FROM athletes
      WHERE name LIKE ? OR school LIKE ?
      ORDER BY name ASC
      LIMIT 20
    `).all(`%${req.params.query}%`, `%${req.params.query}%`);

    res.json(athletes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single athlete
router.delete('/:id', (req, res) => {
  try {
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    // Delete related results first (foreign key)
    db.prepare('DELETE FROM results WHERE athlete_id = ?').run(req.params.id);

    // Delete related draft picks
    db.prepare('DELETE FROM draft_picks WHERE athlete_id = ?').run(req.params.id);

    // Delete the athlete
    db.prepare('DELETE FROM athletes WHERE id = ?').run(req.params.id);

    res.json({ message: 'Athlete deleted successfully', athlete });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all athletes (with optional gender filter)
router.delete('/', (req, res) => {
  try {
    const { gender } = req.query;

    let athleteIds;
    if (gender) {
      athleteIds = db.prepare('SELECT id FROM athletes WHERE gender = ?').all(gender);
    } else {
      athleteIds = db.prepare('SELECT id FROM athletes').all();
    }

    const ids = athleteIds.map(a => a.id);

    if (ids.length === 0) {
      return res.json({ message: 'No athletes to delete', count: 0 });
    }

    // Delete related data first
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM results WHERE athlete_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM draft_picks WHERE athlete_id IN (${placeholders})`).run(...ids);

    // Delete athletes
    if (gender) {
      db.prepare('DELETE FROM athletes WHERE gender = ?').run(gender);
    } else {
      db.prepare('DELETE FROM athletes').run();
    }

    res.json({
      message: `Deleted ${ids.length} ${gender ? gender : 'all'} athletes successfully`,
      count: ids.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all athletes without grades (likely high school athletes)
router.post('/delete-no-grade', (req, res) => {
  try {
    console.log('\n=== Deleting Athletes Without Grades ===');

    // Get count of athletes without grades
    const athletesWithoutGrade = db.prepare(`
      SELECT id, name, school
      FROM athletes
      WHERE grade IS NULL OR grade = ''
    `).all();

    console.log(`Found ${athletesWithoutGrade.length} athletes without grades`);

    if (athletesWithoutGrade.length === 0) {
      return res.json({
        message: 'No athletes without grades found',
        count: 0
      });
    }

    // Sample athletes to be deleted
    console.log('Sample athletes to delete:');
    athletesWithoutGrade.slice(0, 10).forEach(a => {
      console.log(`  ${a.name} (${a.school})`);
    });

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

    console.log(`\nDeleted ${deletedCount} athletes without grades`);

    res.json({
      message: `Deleted ${deletedCount} athlete(s) without grades`,
      count: deletedCount,
      sampleDeleted: athletesWithoutGrade.slice(0, 20).map(a => `${a.name} (${a.school})`)
    });
  } catch (error) {
    console.error('Error deleting athletes without grades:', error);
    res.status(500).json({ error: error.message });
  }
});

// Migration: Update all athlete grades to reflect current year (2025-2026 season)
// This assumes most athletes advance one grade level per year
router.post('/migrate-grades', (req, res) => {
  try {
    console.log('\n=== Migrating Athlete Grades ===');

    const gradeProgression = {
      'FR': 'SO',  // Freshman -> Sophomore
      'SO': 'JR',  // Sophomore -> Junior
      'JR': 'SR',  // Junior -> Senior
      'SR': 'SR'   // Senior stays Senior (or graduates)
    };

    // Get all athletes with their most recent meet
    const athletes = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.school,
        a.grade as current_grade,
        MAX(m.date) as most_recent_meet_date
      FROM athletes a
      LEFT JOIN results r ON a.id = r.athlete_id
      LEFT JOIN meets m ON r.meet_id = m.id
      WHERE a.grade IS NOT NULL
      GROUP BY a.id
    `).all();

    let updatedCount = 0;
    const updates = [];

    athletes.forEach(athlete => {
      // If most recent meet is from 2024 or earlier, advance grade by 1
      if (athlete.most_recent_meet_date && athlete.most_recent_meet_date < '2025-01-01') {
        const newGrade = gradeProgression[athlete.current_grade];
        if (newGrade && newGrade !== athlete.current_grade) {
          db.prepare(`
            UPDATE athletes
            SET grade = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newGrade, athlete.id);

          updates.push({
            name: athlete.name,
            school: athlete.school,
            oldGrade: athlete.current_grade,
            newGrade: newGrade,
            lastRaced: athlete.most_recent_meet_date
          });
          updatedCount++;
        }
      }
    });

    console.log(`Updated ${updatedCount} athlete grades`);
    if (updates.length > 0) {
      console.log('Sample updates:');
      updates.slice(0, 10).forEach(u => {
        console.log(`  ${u.name} (${u.school}): ${u.oldGrade} -> ${u.newGrade} (last raced: ${u.lastRaced})`);
      });
    }

    res.json({
      message: `Migrated ${updatedCount} athlete grades to current season`,
      athletesChecked: athletes.length,
      athletesUpdated: updatedCount,
      sampleUpdates: updates.slice(0, 20)
    });
  } catch (error) {
    console.error('Error migrating grades:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync athlete grades note - grades are automatically updated based on most recent meet
// This endpoint is just for information
router.get('/grade-info', (req, res) => {
  try {
    const info = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.school,
        a.grade,
        MAX(m.date) as most_recent_meet_date,
        m.name as most_recent_meet_name
      FROM athletes a
      LEFT JOIN results r ON a.id = r.athlete_id
      LEFT JOIN meets m ON r.meet_id = m.id
      GROUP BY a.id
      ORDER BY most_recent_meet_date DESC
      LIMIT 10
    `).all();

    res.json({
      message: 'Athlete grades are automatically updated when you import new meets with more recent dates',
      sampleAthletes: info
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
