import express from 'express';
import db from '../db/database.js';
import { wss } from '../index.js';

const router = express.Router();

// Broadcast draft update to all WebSocket clients
function broadcastDraftUpdate(draftId, data) {
  const message = JSON.stringify({ type: 'draft_update', draftId, ...data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Get all drafts
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting all drafts...');
    const drafts = await db.prepare(`
      SELECT d.*, COUNT(DISTINCT t.id) as team_count
      FROM drafts d
      LEFT JOIN teams t ON d.id = t.draft_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `).all();

    console.log('✅ Found', drafts.length, 'drafts');
    res.json(drafts);
  } catch (error) {
    console.error('❌ Error getting drafts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new draft
router.post('/', async (req, res) => {
  try {
    const { name, total_rounds = 7, snake_draft = true, gender } = req.body;

    const result = await db.prepare(`
      INSERT INTO drafts (name, total_rounds, snake_draft, gender)
      VALUES (?, ?, ?, ?)
    `).run(name, total_rounds, snake_draft ? 1 : 0, gender);

    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get draft details
router.get('/:id', async (req, res) => {
  try {
    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const teams = await db.prepare('SELECT * FROM teams WHERE draft_id = ?').all(req.params.id);
    const picks = await db.prepare(`
      SELECT dp.*, a.name as athlete_name, a.school, t.name as team_name
      FROM draft_picks dp
      JOIN athletes a ON dp.athlete_id = a.id
      JOIN teams t ON dp.team_id = t.id
      WHERE dp.draft_id = ?
      ORDER BY dp.overall_pick ASC
    `).all(req.params.id);

    const draftOrder = await db.prepare(`
      SELECT do.position, t.id as team_id, t.name as team_name, t.owner_name
      FROM draft_order do
      JOIN teams t ON do.team_id = t.id
      WHERE do.draft_id = ?
      ORDER BY do.position ASC
    `).all(req.params.id);

    res.json({ ...draft, teams, picks, draftOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set draft order
router.post('/:id/order', async (req, res) => {
  try {
    const { teamIds } = req.body; // Array of team IDs in draft order

    // Clear existing order
    await db.prepare('DELETE FROM draft_order WHERE draft_id = ?').run(req.params.id);

    // Insert new order
    const insertOrder = await db.prepare(`
      INSERT INTO draft_order (draft_id, team_id, position)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction((draftId, teams) => {
      teams.forEach((teamId, index) => {
        insertOrder.run(draftId, teamId, index + 1);
      });
    });

    transaction(req.params.id, teamIds);

    res.json({ message: 'Draft order set successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate current team on the clock (snake draft logic)
async function getCurrentTeamOnClock(draftId) {
  const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(draftId);
  const draftOrder = await db.prepare(`
    SELECT team_id, position FROM draft_order WHERE draft_id = ? ORDER BY position ASC
  `).all(draftId);

  if (!draft || draftOrder.length === 0) {
    return null;
  }

  const { current_round, snake_draft } = draft;
  const numTeams = draftOrder.length;

  // Calculate position in draft order
  let position;
  if (snake_draft && current_round % 2 === 0) {
    // Even rounds go in reverse order (snake)
    const picks = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_picks WHERE draft_id = ? AND round = ?'
    ).get(draftId, current_round);

    position = numTeams - picks.count;
  } else {
    // Odd rounds go in normal order
    const picks = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_picks WHERE draft_id = ? AND round = ?'
    ).get(draftId, current_round);

    position = picks.count + 1;
  }

  const teamOnClock = draftOrder.find(t => t.position === position);
  return teamOnClock ? teamOnClock.team_id : null;
}

// Get current pick info
router.get('/:id/current-pick', async (req, res) => {
  try {
    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const teamId = await getCurrentTeamOnClock(req.params.id);
    if (!teamId) {
      return res.json({ message: 'Draft not started or completed' });
    }

    const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    res.json({
      round: draft.current_round,
      teamOnClock: team,
      status: draft.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start draft
router.post('/:id/start', async (req, res) => {
  try {
    await db.prepare(`
      UPDATE drafts
      SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
    broadcastDraftUpdate(req.params.id, { status: 'started', draft });

    res.json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Make a pick
router.post('/:id/pick', async (req, res) => {
  try {
    const { team_id, athlete_id } = req.body;
    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);

    if (draft.status !== 'in_progress') {
      return res.status(400).json({ error: 'Draft is not in progress' });
    }

    // Verify it's this team's turn
    const teamOnClock = await getCurrentTeamOnClock(req.params.id);
    if (teamOnClock !== team_id) {
      return res.status(400).json({ error: 'Not this team\'s turn to pick' });
    }

    // Check if athlete already drafted
    const alreadyDrafted = await db.prepare(
      'SELECT * FROM draft_picks WHERE draft_id = ? AND athlete_id = ?'
    ).get(req.params.id, athlete_id);

    if (alreadyDrafted) {
      return res.status(400).json({ error: 'Athlete already drafted' });
    }

    // Calculate overall pick number
    const pickCount = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_picks WHERE draft_id = ?'
    ).get(req.params.id);

    const overallPick = pickCount.count + 1;
    const pickInRound = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_picks WHERE draft_id = ? AND round = ?'
    ).get(req.params.id, draft.current_round);

    // Insert the pick
    await db.prepare(`
      INSERT INTO draft_picks (draft_id, team_id, athlete_id, round, pick_number, overall_pick)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, team_id, athlete_id, draft.current_round, pickInRound.count + 1, overallPick);

    // Get draft order to determine if round is complete
    const draftOrder = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_order WHERE draft_id = ?'
    ).get(req.params.id);

    const numTeams = draftOrder.count;
    const picksInRound = pickInRound.count + 1;

    // Update draft status
    if (picksInRound === numTeams) {
      // Round complete
      if (draft.current_round >= draft.total_rounds) {
        // Draft complete
        await db.prepare(`
          UPDATE drafts
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(req.params.id);
      } else {
        // Advance to next round
        await db.prepare(`
          UPDATE drafts
          SET current_round = current_round + 1
          WHERE id = ?
        `).run(req.params.id);
      }
    }

    const pick = await db.prepare(`
      SELECT dp.*, a.name as athlete_name, a.school, t.name as team_name
      FROM draft_picks dp
      JOIN athletes a ON dp.athlete_id = a.id
      JOIN teams t ON dp.team_id = t.id
      WHERE dp.draft_id = ? AND dp.overall_pick = ?
    `).get(req.params.id, overallPick);

    const updatedDraft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);

    // Broadcast pick to all clients
    broadcastDraftUpdate(req.params.id, {
      type: 'pick_made',
      pick,
      draft: updatedDraft
    });

    res.json({ pick, draft: updatedDraft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Undo last pick
router.post('/:id/undo', async (req, res) => {
  try {
    const lastPick = await db.prepare(`
      SELECT * FROM draft_picks
      WHERE draft_id = ?
      ORDER BY overall_pick DESC
      LIMIT 1
    `).get(req.params.id);

    if (!lastPick) {
      return res.status(400).json({ error: 'No picks to undo' });
    }

    await db.prepare('DELETE FROM draft_picks WHERE id = ?').run(lastPick.id);

    // Update draft status back if needed
    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);

    if (draft.status === 'completed') {
      await db.prepare(`
        UPDATE drafts
        SET status = 'in_progress', completed_at = NULL
        WHERE id = ?
      `).run(req.params.id);
    }

    // Check if we need to go back a round
    const picksInCurrentRound = await db.prepare(
      'SELECT COUNT(*) as count FROM draft_picks WHERE draft_id = ? AND round = ?'
    ).get(req.params.id, draft.current_round);

    if (picksInCurrentRound.count === 0 && draft.current_round > 1) {
      await db.prepare(`
        UPDATE drafts
        SET current_round = current_round - 1
        WHERE id = ?
      `).run(req.params.id);
    }

    const updatedDraft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);

    broadcastDraftUpdate(req.params.id, {
      type: 'pick_undone',
      draft: updatedDraft
    });

    res.json({ message: 'Pick undone', draft: updatedDraft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete draft
router.delete('/:id', async (req, res) => {
  try {
    const draft = await db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Delete in transaction to maintain referential integrity
    db.transaction(() => {
      // Delete draft picks
      db.prepare('DELETE FROM draft_picks WHERE draft_id = ?').run(req.params.id);

      // Delete draft order
      db.prepare('DELETE FROM draft_order WHERE draft_id = ?').run(req.params.id);

      // Delete teams (this will cascade to team_scores if foreign keys are set)
      db.prepare('DELETE FROM teams WHERE draft_id = ?').run(req.params.id);

      // Delete the draft itself
      db.prepare('DELETE FROM drafts WHERE id = ?').run(req.params.id);
    })();

    res.json({
      message: 'Draft deleted successfully',
      draft: draft
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
