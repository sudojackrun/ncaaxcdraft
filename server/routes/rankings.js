import express from 'express';
import db from '../db/database.js';

const router = express.Router();

/**
 * Calculate and update athlete rankings based on PR times
 * Rankings are gender-specific and based on best PR across all distances
 */
router.post('/calculate', async (req, res) => {
  try {
    console.log('Calculating athlete rankings...');

    // Get all athletes with their best times
    const athletes = await db.prepare(`
      SELECT
        id,
        name,
        gender,
        COALESCE(pr_5k_seconds, 999999) as pr_5k_sec,
        COALESCE(pr_6k_seconds, 999999) as pr_6k_sec,
        COALESCE(pr_8k_seconds, 999999) as pr_8k_sec,
        COALESCE(pr_10k_seconds, 999999) as pr_10k_sec
      FROM athletes
      WHERE gender IS NOT NULL
    `).all();

    // For each athlete, find their best time across all distances
    // Normalize to 5K equivalent for fair comparison
    const athletesWithScores = athletes.map(athlete => {
      // Conversion factors to normalize all distances to 5K
      const conversions = {
        pr_5k_sec: 1.0,        // 5K = 5K
        pr_6k_sec: 0.833,      // 6K → 5K (5/6)
        pr_8k_sec: 0.625,      // 8K → 5K (5/8)
        pr_10k_sec: 0.5        // 10K → 5K (5/10)
      };

      // Convert all PRs to 5K equivalent
      const normalized5KTimes = [
        athlete.pr_5k_sec * conversions.pr_5k_sec,
        athlete.pr_6k_sec * conversions.pr_6k_sec,
        athlete.pr_8k_sec * conversions.pr_8k_sec,
        athlete.pr_10k_sec * conversions.pr_10k_sec
      ];

      // Get the best (fastest) normalized time
      const bestNormalized5K = Math.min(...normalized5KTimes.filter(t => t < 999999));

      return {
        ...athlete,
        normalized5K: bestNormalized5K < 999999 ? bestNormalized5K : null
      };
    });

    // Separate by gender and rank
    const genders = ['M', 'F'];
    let totalRanked = 0;

    for (const gender of genders) {
      // Get athletes of this gender with valid times
      const genderAthletes = athletesWithScores
        .filter(a => a.gender === gender && a.normalized5K !== null)
        .sort((a, b) => a.normalized5K - b.normalized5K); // Fastest first

      // Assign rankings
      for (const [index, athlete] of genderAthletes.entries()) {
        const ranking = index + 1;

        await db.prepare(`
          UPDATE athletes
          SET ranking = ?
          WHERE id = ?
        `).run(ranking, athlete.id);

        totalRanked++;
      }

      console.log(`Ranked ${genderAthletes.length} ${gender} athletes`);
    }

    // Set ranking to NULL for athletes without any PR
    await db.prepare(`
      UPDATE athletes
      SET ranking = NULL
      WHERE pr_5k_seconds IS NULL
        AND pr_6k_seconds IS NULL
        AND pr_8k_seconds IS NULL
        AND pr_10k_seconds IS NULL
    `).run();

    res.json({
      success: true,
      message: `Rankings calculated for ${totalRanked} athletes`,
      menRanked: athletesWithScores.filter(a => a.gender === 'M' && a.normalized5K !== null).length,
      womenRanked: athletesWithScores.filter(a => a.gender === 'F' && a.normalized5K !== null).length
    });

  } catch (error) {
    console.error('Error calculating rankings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get top ranked athletes
 */
router.get('/top', async (req, res) => {
  try {
    const { gender, limit = 50 } = req.query;

    let query = `
      SELECT
        id, name, school, gender, grade,
        pr_5k, pr_6k, pr_8k, pr_10k,
        ranking
      FROM athletes
      WHERE ranking IS NOT NULL
    `;

    const params = [];

    if (gender) {
      query += ' AND gender = ?';
      params.push(gender);
    }

    query += ' ORDER BY ranking ASC LIMIT ?';
    params.push(parseInt(limit));

    const topAthletes = await db.prepare(query).all(...params);

    res.json(topAthletes);
  } catch (error) {
    console.error('Error getting top athletes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
