import express from 'express';
import db from '../db/database.js';
import {
  scrapeMeetResults,
  scrapeAthleteProfile,
  TFRRS_MEETS_2024
} from '../utils/tfrrs-scraper.js';

const router = express.Router();

/**
 * Import meet results from TFRRS URL
 * POST /api/import/meet
 * Body: { meetUrl: string, meetName: string, meetDate: string }
 */
router.post('/meet', async (req, res) => {
  try {
    const { meetUrl, meetName, meetDate } = req.body;

    if (!meetUrl) {
      return res.status(400).json({ error: 'meetUrl is required' });
    }

    console.log(`Scraping meet from: ${meetUrl}`);
    const meetData = await scrapeMeetResults(meetUrl);

    // Create meet in database
    const meetResult = await db.prepare(`
      INSERT INTO meets (name, date, location, distance, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      meetName || 'Imported Meet',
      meetDate || new Date().toISOString().split('T')[0],
      'NCAA D1',
      '5K', // Default for XC
      'completed'
    );

    const meetId = meetResult.lastInsertRowid;
    let athletesImported = 0;
    let resultsImported = 0;

    // Import results
    for (const result of meetData.results) {
      // Check if athlete exists, if not create them
      let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
        .get(result.name, result.school);

      if (!athlete) {
        const athleteResult = await db.prepare(`
          INSERT INTO athletes (name, school, gender, pr_5k, pr_5k_seconds, tfrrs_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          result.name,
          result.school,
          'M', // Default, can be updated
          result.time,
          result.timeSeconds,
          result.athleteUrl
        );

        athlete = { id: athleteResult.lastInsertRowid };
        athletesImported++;
      } else {
        // Update PR if this time is better
        if (result.timeSeconds && result.timeSeconds < (athlete.pr_5k_seconds || Infinity)) {
          await db.prepare(`
            UPDATE athletes
            SET pr_5k = ?, pr_5k_seconds = ?, tfrrs_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(result.time, result.timeSeconds, result.athleteUrl, athlete.id);
        }
      }

      // Add result
      try {
        await db.prepare(`
          INSERT INTO results (meet_id, athlete_id, place, time, time_seconds)
          VALUES (?, ?, ?, ?, ?)
        `).run(meetId, athlete.id, result.place, result.time, result.timeSeconds);
        resultsImported++;
      } catch (err) {
        // Ignore duplicate results
        if (!err.message.includes('UNIQUE constraint')) {
          console.error('Error inserting result:', err);
        }
      }
    }

    res.json({
      success: true,
      meetId,
      athletesImported,
      resultsImported,
      totalResults: meetData.results.length
    });

  } catch (error) {
    console.error('Error importing meet:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Import specific athlete from TFRRS
 * POST /api/import/athlete
 * Body: { athleteUrl: string }
 */
router.post('/athlete', async (req, res) => {
  try {
    const { athleteUrl } = req.body;

    if (!athleteUrl) {
      return res.status(400).json({ error: 'athleteUrl is required' });
    }

    console.log(`Scraping athlete from: ${athleteUrl}`);
    const athleteData = await scrapeAthleteProfile(athleteUrl);

    // Check if athlete exists
    let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
      .get(athleteData.name, athleteData.school);

    if (athlete) {
      // Update existing athlete
      await db.prepare(`
        UPDATE athletes
        SET
          pr_5k = COALESCE(?, pr_5k),
          pr_5k_seconds = COALESCE(?, pr_5k_seconds),
          tfrrs_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        athleteData.prs['5000 Meters'] || null,
        null, // Would need to convert
        athleteData.profileUrl,
        athlete.id
      );

      res.json({ success: true, updated: true, athleteId: athlete.id });
    } else {
      // Create new athlete
      const result = await db.prepare(`
        INSERT INTO athletes (name, school, pr_5k, tfrrs_url)
        VALUES (?, ?, ?, ?)
      `).run(
        athleteData.name,
        athleteData.school,
        athleteData.prs['5000 Meters'] || null,
        athleteData.profileUrl
      );

      res.json({ success: true, created: true, athleteId: result.lastInsertRowid });
    }

  } catch (error) {
    console.error('Error importing athlete:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get predefined TFRRS meet URLs for 2024 season
 * GET /api/import/meets/2024
 */
router.get('/meets/2024', async (req, res) => {
  const meets = Object.entries(TFRRS_MEETS_2024).map(([key, url]) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    url
  }));

  res.json(meets);
});

/**
 * Bulk import from predefined 2024 meet
 * POST /api/import/bulk/2024/:meetKey
 */
router.post('/bulk/2024/:meetKey', async (req, res) => {
  try {
    const { meetKey } = req.params;
    const meetUrl = TFRRS_MEETS_2024[meetKey];

    if (!meetUrl) {
      return res.status(404).json({ error: 'Meet not found' });
    }

    const meetName = meetKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const meetDate = '2024-11-23'; // NCAA Championships date

    console.log(`Bulk importing ${meetName}...`);

    const meetData = await scrapeMeetResults(meetUrl);

    // Create meet
    const meetResult = await db.prepare(`
      INSERT INTO meets (name, date, location, distance, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(meetName, meetDate, 'NCAA D1', '5K', 'completed');

    const meetId = meetResult.lastInsertRowid;
    let athletesImported = 0;
    let resultsImported = 0;

    // Import all results
    for (const result of meetData.results) {
      let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
        .get(result.name, result.school);

      if (!athlete) {
        const athleteResult = await db.prepare(`
          INSERT INTO athletes (name, school, pr_5k, pr_5k_seconds, tfrrs_url)
          VALUES (?, ?, ?, ?, ?)
        `).run(result.name, result.school, result.time, result.timeSeconds, result.athleteUrl);

        athlete = { id: athleteResult.lastInsertRowid };
        athletesImported++;
      }

      try {
        await db.prepare(`
          INSERT INTO results (meet_id, athlete_id, place, time, time_seconds)
          VALUES (?, ?, ?, ?, ?)
        `).run(meetId, athlete.id, result.place, result.time, result.timeSeconds);
        resultsImported++;
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint')) {
          console.error('Error inserting result:', err);
        }
      }
    }

    res.json({
      success: true,
      meetId,
      meetName,
      athletesImported,
      resultsImported,
      totalResults: meetData.results.length
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
