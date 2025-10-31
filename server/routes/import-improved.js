import express from 'express';
import db from '../db/database.js';
import {
  scrapeMeetResults,
  validateTFRRSUrl,
  CURRENT_SEASON_MEETS
} from '../utils/tfrrs-scraper-working.js';

const router = express.Router();

/**
 * Import meet results from TFRRS URL with validation
 */
router.post('/meet', async (req, res) => {
  try {
    const { meetUrl, meetName, meetDate, gender } = req.body;

    if (!meetUrl) {
      return res.status(400).json({ error: 'meetUrl is required' });
    }

    // Validate URL
    const validation = validateTFRRSUrl(meetUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    console.log(`Scraping meet from: ${meetUrl}`);

    try {
      const meetData = await scrapeMeetResults(meetUrl, gender);

      // Use scraped meet name and date, fall back to provided or defaults
      const finalMeetName = meetData.meetName || meetName || 'Imported Meet';
      const finalMeetDate = meetData.meetDate || meetDate || new Date().toISOString().split('T')[0];

      console.log(`Creating meet: ${finalMeetName} on ${finalMeetDate}`);

      // Create meet in database with actual race distance
      const meetResult = await db.prepare(`
        INSERT INTO meets (name, date, location, distance, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        finalMeetName,
        finalMeetDate,
        'NCAA D1',
        meetData.raceDistance || '5K',
        'completed'
      );

      const meetId = meetResult.lastInsertRowid;
      let athletesImported = 0;
      let athletesUpdated = 0;
      let resultsImported = 0;

      // Determine which PR field to use based on race distance
      const distanceFields = {
        '5K': {
          pr: 'pr_5k',
          pr_seconds: 'pr_5k_seconds',
          pr_meet_name: 'pr_5k_meet_name',
          pr_meet_date: 'pr_5k_meet_date'
        },
        '6K': {
          pr: 'pr_6k',
          pr_seconds: 'pr_6k_seconds',
          pr_meet_name: 'pr_6k_meet_name',
          pr_meet_date: 'pr_6k_meet_date'
        },
        '8K': {
          pr: 'pr_8k',
          pr_seconds: 'pr_8k_seconds',
          pr_meet_name: 'pr_8k_meet_name',
          pr_meet_date: 'pr_8k_meet_date'
        },
        '10K': {
          pr: 'pr_10k',
          pr_seconds: 'pr_10k_seconds',
          pr_meet_name: 'pr_10k_meet_name',
          pr_meet_date: 'pr_10k_meet_date'
        }
      };

      // Import results
      for (const result of meetData.results) {
        // Determine PR field based on THIS result's distance (not meet-level distance)
        const resultDistance = result.raceDistance || meetData.raceDistance || '5K';
        const prField = distanceFields[resultDistance] || distanceFields['5K'];

        console.log(`Importing ${result.name}: ${resultDistance} time ${result.time} -> ${prField.pr}`);

        let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
          .get(result.name, result.school);

        if (!athlete) {
          // Create new athlete with grade and appropriate PR field
          // Use detected gender from scraper, not config!
          const detectedGender = result.gender || gender || 'M';

          const athleteResult = await db.prepare(`
            INSERT INTO athletes (
              name, school, grade, gender,
              ${prField.pr}, ${prField.pr_seconds},
              ${prField.pr_meet_name}, ${prField.pr_meet_date},
              tfrrs_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            result.name,
            result.school,
            result.grade || null,
            detectedGender,
            result.time,
            result.timeSeconds,
            meetData.meetName || null,
            meetData.meetDate || null,
            result.athleteUrl || null
          );

          athlete = { id: athleteResult.lastInsertRowid };
          athletesImported++;
        } else {
          // Update PR if this time is better for this specific distance
          const currentPR = athlete[prField.pr_seconds];
          const shouldUpdatePR = result.timeSeconds && result.timeSeconds < (currentPR || Infinity);

          // Check if we should update grade based on most recent meet
          // Get the most recent meet date for this athlete
          const mostRecentMeet = await db.prepare(`
            SELECT MAX(m.date) as latest_date
            FROM results r
            JOIN meets m ON r.meet_id = m.id
            WHERE r.athlete_id = ?
          `).get(athlete.id);

          const shouldUpdateGrade = result.grade && (
            !mostRecentMeet.latest_date ||
            meetData.meetDate >= mostRecentMeet.latest_date
          );

          if (shouldUpdatePR || shouldUpdateGrade) {
            if (shouldUpdatePR) {
              await db.prepare(`
                UPDATE athletes
                SET ${prField.pr} = ?,
                    ${prField.pr_seconds} = ?,
                    ${prField.pr_meet_name} = ?,
                    ${prField.pr_meet_date} = ?,
                    grade = COALESCE(?, grade),
                    tfrrs_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(result.time, result.timeSeconds, meetData.meetName || null, meetData.meetDate || null, shouldUpdateGrade ? result.grade : null, result.athleteUrl || null, athlete.id);
            } else if (shouldUpdateGrade) {
              // Only update grade (no PR update needed)
              await db.prepare(`
                UPDATE athletes
                SET grade = ?,
                    tfrrs_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(result.grade || null, result.athleteUrl || null, athlete.id);
            }
            athletesUpdated++;
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
          if (!err.message.includes('UNIQUE constraint')) {
            console.error('Error inserting result:', err);
          }
        }
      }

      res.json({
        success: true,
        meetId,
        meetName: finalMeetName,
        meetDate: finalMeetDate,
        athletesImported,
        athletesUpdated,
        resultsImported,
        totalResults: meetData.results.length
      });

    } catch (scrapeError) {
      // Provide helpful error messages
      if (scrapeError.message.includes('403')) {
        return res.status(429).json({
          error: 'TFRRS is blocking requests. Please wait 5-10 minutes and try again.',
          details: 'TFRRS uses rate limiting to prevent automated access. Try again later.'
        });
      } else if (scrapeError.message.includes('404')) {
        return res.status(404).json({
          error: 'Meet not found. Please check the URL is correct.',
          details: scrapeError.message
        });
      } else {
        throw scrapeError;
      }
    }

  } catch (error) {
    console.error('Error importing meet:', error);
    res.status(500).json({
      error: error.message,
      hint: 'Make sure the URL is a valid TFRRS cross country results page'
    });
  }
});

/**
 * Get current season meets
 */
router.get('/meets/current-season', async (req, res) => {
  const meets = Object.entries(CURRENT_SEASON_MEETS).map(([key, data]) => ({
    id: key,
    ...data
  }));

  res.json(meets);
});

/**
 * Auto-import all current season meets (use with caution - takes time!)
 */
router.post('/auto-import/season', async (req, res) => {
  const { meetIds } = req.body; // Optional: specify which meets to import

  const meetsToImport = meetIds
    ? meetIds.map(id => ({ id, ...CURRENT_SEASON_MEETS[id] })).filter(m => m.url)
    : Object.entries(CURRENT_SEASON_MEETS).map(([id, data]) => ({ id, ...data }));

  const results = {
    success: [],
    failed: [],
    totalAthletes: 0,
    totalResults: 0
  };

  // Import meets one at a time with delays
  for (const meet of meetsToImport) {
    try {
      console.log(`Auto-importing: ${meet.name}`);

      const meetData = await scrapeMeetResults(meet.url, meet.gender);

      // Create meet
      const meetResult = await db.prepare(`
        INSERT INTO meets (name, date, location, distance, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(meet.name, meet.date, 'NCAA D1', meetData.raceDistance || meet.distance || '5K', 'completed');

      const meetId = meetResult.lastInsertRowid;
      let athletesCount = 0;
      let resultsCount = 0;

      // Determine PR field based on distance
      const distanceFields = {
        '5K': {
          pr: 'pr_5k',
          pr_seconds: 'pr_5k_seconds',
          pr_meet_name: 'pr_5k_meet_name',
          pr_meet_date: 'pr_5k_meet_date'
        },
        '6K': {
          pr: 'pr_6k',
          pr_seconds: 'pr_6k_seconds',
          pr_meet_name: 'pr_6k_meet_name',
          pr_meet_date: 'pr_6k_meet_date'
        },
        '8K': {
          pr: 'pr_8k',
          pr_seconds: 'pr_8k_seconds',
          pr_meet_name: 'pr_8k_meet_name',
          pr_meet_date: 'pr_8k_meet_date'
        },
        '10K': {
          pr: 'pr_10k',
          pr_seconds: 'pr_10k_seconds',
          pr_meet_name: 'pr_10k_meet_name',
          pr_meet_date: 'pr_10k_meet_date'
        }
      };
      // Import results
      for (const result of meetData.results) {
        // Determine PR field based on THIS result's distance
        const resultDistance = result.raceDistance || meetData.raceDistance || '5K';
        const prField = distanceFields[resultDistance] || distanceFields['5K'];

        let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
          .get(result.name, result.school);

        if (!athlete) {
          // Use detected gender from scraper, not config!
          const detectedGender = result.gender || meet.gender || 'M';

          const athleteResult = await db.prepare(`
            INSERT INTO athletes (
              name, school, grade, gender,
              ${prField.pr}, ${prField.pr_seconds},
              ${prField.pr_meet_name}, ${prField.pr_meet_date},
              tfrrs_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            result.name,
            result.school,
            result.grade || null,
            detectedGender,
            result.time,
            result.timeSeconds,
            meetData.meetName || null,
            meetData.meetDate || null,
            result.athleteUrl || null
          );
          athlete = { id: athleteResult.lastInsertRowid };
          athletesCount++;
        }

        try {
          await db.prepare(`
            INSERT INTO results (meet_id, athlete_id, place, time, time_seconds)
            VALUES (?, ?, ?, ?, ?)
          `).run(meetId, athlete.id, result.place, result.time, result.timeSeconds);
          resultsCount++;
        } catch (err) {
          // Skip duplicates
        }
      }

      results.success.push({
        meet: meet.name,
        athletesImported: athletesCount,
        resultsImported: resultsCount
      });

      results.totalAthletes += athletesCount;
      results.totalResults += resultsCount;

      // Wait between meets to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error(`Failed to import ${meet.name}:`, error.message);
      results.failed.push({
        meet: meet.name,
        error: error.message
      });

      // If we get blocked, stop trying
      if (error.message.includes('403')) {
        results.rateLimited = true;
        break;
      }
    }
  }

  res.json(results);
});

/**
 * Bulk import specific meet from current season
 */
router.post('/bulk/current-season/:meetKey', async (req, res) => {
  try {
    const { meetKey } = req.params;
    const meet = CURRENT_SEASON_MEETS[meetKey];

    if (!meet) {
      return res.status(404).json({
        error: 'Meet not found',
        availableMeets: Object.keys(CURRENT_SEASON_MEETS)
      });
    }

    console.log(`Bulk importing ${meet.name}...`);

    try {
      const meetData = await scrapeMeetResults(meet.url, meet.gender);

      // Create meet
      const meetResult = await db.prepare(`
        INSERT INTO meets (name, date, location, distance, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(meet.name, meet.date, 'NCAA D1', meetData.raceDistance || meet.distance || '5K', 'completed');

      const meetId = meetResult.lastInsertRowid;
      let athletesImported = 0;
      let athletesUpdated = 0;
      let resultsImported = 0;

      // Determine PR field based on distance
      const distanceFields = {
        '5K': {
          pr: 'pr_5k',
          pr_seconds: 'pr_5k_seconds',
          pr_meet_name: 'pr_5k_meet_name',
          pr_meet_date: 'pr_5k_meet_date'
        },
        '6K': {
          pr: 'pr_6k',
          pr_seconds: 'pr_6k_seconds',
          pr_meet_name: 'pr_6k_meet_name',
          pr_meet_date: 'pr_6k_meet_date'
        },
        '8K': {
          pr: 'pr_8k',
          pr_seconds: 'pr_8k_seconds',
          pr_meet_name: 'pr_8k_meet_name',
          pr_meet_date: 'pr_8k_meet_date'
        },
        '10K': {
          pr: 'pr_10k',
          pr_seconds: 'pr_10k_seconds',
          pr_meet_name: 'pr_10k_meet_name',
          pr_meet_date: 'pr_10k_meet_date'
        }
      };
      // Import all results
      for (const result of meetData.results) {
        // Determine PR field based on THIS result's distance
        const resultDistance = result.raceDistance || meetData.raceDistance || '5K';
        const prField = distanceFields[resultDistance] || distanceFields['5K'];

        let athlete = await db.prepare('SELECT * FROM athletes WHERE name = ? AND school = ?')
          .get(result.name, result.school);

        if (!athlete) {
          // Use detected gender from scraper, not config!
          const detectedGender = result.gender || meet.gender || 'M';

          const athleteResult = await db.prepare(`
            INSERT INTO athletes (
              name, school, grade, gender,
              ${prField.pr}, ${prField.pr_seconds},
              ${prField.pr_meet_name}, ${prField.pr_meet_date},
              tfrrs_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            result.name,
            result.school,
            result.grade || null,
            detectedGender,
            result.time,
            result.timeSeconds,
            meetData.meetName || null,
            meetData.meetDate || null,
            result.athleteUrl || null
          );

          athlete = { id: athleteResult.lastInsertRowid };
          athletesImported++;
        } else {
          const currentPR = athlete[prField.pr_seconds];
          if (result.timeSeconds && result.timeSeconds < (currentPR || Infinity)) {
            await db.prepare(`
              UPDATE athletes
              SET ${prField.pr} = ?,
                  ${prField.pr_seconds} = ?,
                  ${prField.pr_meet_name} = ?,
                  ${prField.pr_meet_date} = ?,
                  grade = COALESCE(?, grade),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(result.time, result.timeSeconds, meetData.meetName || null, meetData.meetDate || null, result.grade || null, athlete.id);
            athletesUpdated++;
          }
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
        meetName: meet.name,
        athletesImported,
        athletesUpdated,
        resultsImported,
        totalResults: meetData.results.length
      });

    } catch (scrapeError) {
      if (scrapeError.message.includes('403')) {
        return res.status(429).json({
          error: 'TFRRS is blocking requests. Please wait 5-10 minutes and try again.'
        });
      }
      throw scrapeError;
    }

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
