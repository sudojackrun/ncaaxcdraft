import express from 'express';
import db from '../db/database.js';
import { scrapePTTimingResults, calculateDraftTeamScores } from '../utils/pttiming-scraper.js';

const router = express.Router();

// In-memory store for active live race tracking
const activeRaces = new Map();

/**
 * Start tracking a live race for a draft
 * POST /api/live-race/:draftId/start
 * Body: { liveResultsUrl: "https://live.pttiming.com/..." }
 */
router.post('/:draftId/start', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { liveResultsUrl } = req.body;

    if (!liveResultsUrl || !liveResultsUrl.includes('pttiming.com')) {
      return res.status(400).json({ error: 'Invalid PTTiming URL' });
    }

    // Get draft info and teams
    const draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Get all teams with their rosters
    const teams = db.prepare('SELECT * FROM teams WHERE draft_id = ?').all(draftId);
    const teamsWithRosters = teams.map(team => {
      const roster = db.prepare(`
        SELECT a.*
        FROM athletes a
        JOIN draft_picks dp ON a.id = dp.athlete_id
        WHERE dp.team_id = ?
      `).all(team.id);

      return { ...team, roster };
    });

    console.log(`Starting live race tracking for draft ${draftId}`);
    console.log(`URL: ${liveResultsUrl}`);
    console.log(`Teams: ${teamsWithRosters.length}`);

    // Initial scrape
    const liveResults = await scrapePTTimingResults(liveResultsUrl);
    const teamScores = calculateDraftTeamScores(liveResults.results, teamsWithRosters);

    // Store in active races (use integer key for consistency)
    activeRaces.set(parseInt(draftId), {
      draftId: parseInt(draftId),
      url: liveResultsUrl,
      teams: teamsWithRosters,
      lastUpdate: new Date(),
      liveResults,
      teamScores
    });

    res.json({
      message: 'Live race tracking started',
      raceData: {
        raceTitle: liveResults.raceTitle,
        totalResults: liveResults.results.length,
        teamScores,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error starting live race tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current live race status for a draft
 * GET /api/live-race/:draftId/status
 */
router.get('/:draftId/status', async (req, res) => {
  try {
    const { draftId } = req.params;
    const race = activeRaces.get(parseInt(draftId));

    if (!race) {
      return res.json({ tracking: false });
    }

    // Scrape fresh data
    try {
      const liveResults = await scrapePTTimingResults(race.url);
      const teamScores = calculateDraftTeamScores(liveResults.results, race.teams);

      // Update stored data
      race.liveResults = liveResults;
      race.teamScores = teamScores;
      race.lastUpdate = new Date();

      res.json({
        tracking: true,
        raceTitle: liveResults.raceTitle,
        totalResults: liveResults.results.length,
        teamScores,
        lastUpdate: race.lastUpdate.toISOString()
      });
    } catch (scrapeError) {
      console.error('Error updating live results:', scrapeError);
      // Return cached data if scraping fails
      res.json({
        tracking: true,
        raceTitle: race.liveResults?.raceTitle || '',
        totalResults: race.liveResults?.results?.length || 0,
        teamScores: race.teamScores || [],
        lastUpdate: race.lastUpdate.toISOString(),
        error: 'Failed to fetch latest data, showing cached results'
      });
    }

  } catch (error) {
    console.error('Error getting live race status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop tracking a live race
 * POST /api/live-race/:draftId/stop
 */
router.post('/:draftId/stop', (req, res) => {
  try {
    const { draftId } = req.params;
    const wasTracking = activeRaces.delete(parseInt(draftId));

    res.json({
      message: wasTracking ? 'Live race tracking stopped' : 'No active tracking for this draft',
      wasTracking
    });
  } catch (error) {
    console.error('Error stopping live race tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detailed results for a specific team
 * GET /api/live-race/:draftId/team/:teamId
 */
router.get('/:draftId/team/:teamId', (req, res) => {
  try {
    const { draftId, teamId } = req.params;
    const race = activeRaces.get(parseInt(draftId));

    if (!race) {
      return res.status(404).json({ error: 'No active race tracking' });
    }

    const teamScore = race.teamScores.find(t => t.teamId === parseInt(teamId));

    if (!teamScore) {
      return res.status(404).json({ error: 'Team not found in race results' });
    }

    res.json({
      ...teamScore,
      raceTitle: race.liveResults.raceTitle,
      lastUpdate: race.lastUpdate.toISOString()
    });

  } catch (error) {
    console.error('Error getting team results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Debug endpoint: Get raw live results and roster comparison with matching analysis
 * GET /api/live-race/:draftId/debug
 */
router.get('/:draftId/debug', (req, res) => {
  try {
    const { draftId } = req.params;
    const race = activeRaces.get(parseInt(draftId));

    if (!race) {
      return res.status(404).json({ error: 'No active race tracking' });
    }

    // Get a sample of live results
    const sampleResults = race.liveResults.results.slice(0, 20);

    // Get all team rosters with detailed matching info
    const teamRosters = race.teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      roster: team.roster.map(athlete => {
        // Try to find potential matches for this athlete
        const potentialMatches = race.liveResults.results
          .filter(result => {
            const schoolLower = (result.school || '').toLowerCase();
            const athleteSchoolLower = (athlete.school || '').toLowerCase();

            // Find results from same school or similar name
            return schoolLower.includes(athleteSchoolLower) ||
                   athleteSchoolLower.includes(schoolLower) ||
                   (result.name || '').toLowerCase().includes((athlete.name || '').toLowerCase().split(' ').pop()); // last name match
          })
          .slice(0, 5)
          .map(result => ({
            name: result.name,
            school: result.school,
            gender: result.gender,
            place: result.place,
            time: result.time
          }));

        return {
          name: athlete.name,
          school: athlete.school,
          gender: athlete.gender,
          potentialMatches: potentialMatches
        };
      })
    }));

    res.json({
      raceTitle: race.liveResults.raceTitle,
      totalLiveResults: race.liveResults.results.length,
      sampleLiveResults: sampleResults,
      teamRosters: teamRosters,
      lastUpdate: race.lastUpdate.toISOString()
    });

  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
