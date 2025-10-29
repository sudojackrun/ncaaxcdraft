import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * TV-OPTIMIZED DRAFT BOARD
 * Large, clean view perfect for projecting onto a TV
 * Shows all draft picks in a grid format
 */
function DraftBoard() {
  const { id } = useParams();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadDraft();

    // Setup WebSocket for live updates
    const websocket = new WebSocket(`ws://localhost:3001/ws`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'draft_update' && data.draftId === parseInt(id)) {
        loadDraft();
      }
    };

    setWs(websocket);

    return () => {
      if (websocket) websocket.close();
    };
  }, [id]);

  const loadDraft = async () => {
    try {
      const res = await fetch(`/api/draft/${id}`);
      const data = await res.json();
      setDraft(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading draft:', error);
      setLoading(false);
    }
  };

  const getCurrentTeam = () => {
    if (!draft?.draftOrder || draft.draftOrder.length === 0) return null;

    const { current_round, snake_draft } = draft;
    const picksInRound = draft.picks.filter(p => p.round === current_round).length;
    const numTeams = draft.draftOrder.length;

    let position;
    if (snake_draft && current_round % 2 === 0) {
      position = numTeams - picksInRound;
    } else {
      position = picksInRound + 1;
    }

    return draft.draftOrder.find(t => t.position === position);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        background: '#1a1a1a',
        color: 'white'
      }}>
        Loading draft board...
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        background: '#1a1a1a',
        color: 'white'
      }}>
        Draft not found
      </div>
    );
  }

  const currentTeam = draft.status === 'in_progress' ? getCurrentTeam() : null;
  const numTeams = draft.teams.length;
  const numRounds = draft.total_rounds;

  // Create grid of all picks (team x round)
  const draftGrid = [];
  for (let round = 1; round <= numRounds; round++) {
    const roundPicks = [];
    for (let teamIdx = 0; teamIdx < numTeams; teamIdx++) {
      const team = draft.teams[teamIdx];

      // Calculate overall pick number for this cell
      let pickPosition;
      if (draft.snake_draft && round % 2 === 0) {
        // Snake: reverse order on even rounds
        pickPosition = numTeams - teamIdx;
      } else {
        pickPosition = teamIdx + 1;
      }

      const overallPick = (round - 1) * numTeams + pickPosition;

      // Find the actual pick for this team/round
      const pick = draft.picks.find(p =>
        p.team_name === team.name && p.round === round
      );

      roundPicks.push({
        team,
        round,
        overallPick,
        pick,
        isCurrentPick: draft.status === 'in_progress' && !pick &&
                       currentTeam?.team_name === team.name &&
                       draft.current_round === round
      });
    }
    draftGrid.push(roundPicks);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'VT323, monospace'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--forest-green)',
        padding: '1.5rem 2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '3rem', color: 'white' }}>
              {draft.name}
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', opacity: 0.9 }}>
              Round {draft.current_round} of {draft.total_rounds}
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            {draft.status === 'completed' ? '🏆 COMPLETED' :
             draft.status === 'in_progress' ? '🔴 LIVE' : '⏸️ NOT STARTED'}
          </div>
        </div>
      </div>

      {/* On The Clock Banner */}
      {currentTeam && (
        <div style={{
          background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ fontSize: '1.5rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            ON THE CLOCK
          </div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {currentTeam.team_name}
          </div>
          <div style={{ fontSize: '1.8rem', opacity: 0.9 }}>
            {currentTeam.owner_name}
          </div>
        </div>
      )}

      {/* Draft Grid */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        {/* Column Headers (Team Names) */}
        <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${numTeams}, 1fr)`, gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
            Round
          </div>
          {draft.teams.map((team, idx) => (
            <div key={team.id} style={{
              padding: '1rem',
              background: 'var(--forest-green)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>
              {team.name}
              <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>
                {team.owner_name}
              </div>
            </div>
          ))}
        </div>

        {/* Draft Picks Grid */}
        {draftGrid.map((roundPicks, roundIdx) => (
          <div key={roundIdx} style={{ display: 'grid', gridTemplateColumns: `auto repeat(${numTeams}, 1fr)`, gap: '0.5rem', marginBottom: '0.5rem' }}>
            {/* Round Number */}
            <div style={{
              padding: '1rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              {roundIdx + 1}
            </div>

            {/* Picks for this round */}
            {roundPicks.map((cell, cellIdx) => (
              <div key={cellIdx} style={{
                padding: '1rem',
                background: cell.isCurrentPick ?
                  'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' :
                  cell.pick ?
                    'rgba(39, 174, 96, 0.3)' :
                    'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: cell.isCurrentPick ? '3px solid #fff' : 'none',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: cell.isCurrentPick ? '0 0 20px rgba(230, 126, 34, 0.6)' : 'none'
              }}>
                {cell.pick ? (
                  <>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                      Pick #{cell.pick.overall_pick}
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {cell.pick.athlete_name}
                    </div>
                    <div style={{ fontSize: '1rem', opacity: 0.9 }}>
                      {cell.pick.school}
                    </div>
                  </>
                ) : cell.isCurrentPick ? (
                  <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                    ⏱️ ON CLOCK
                  </div>
                ) : (
                  <div style={{ fontSize: '1rem', opacity: 0.5, textAlign: 'center' }}>
                    Pick #{cell.overallPick}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Recent Pick Highlight */}
      {draft.picks.length > 0 && draft.status === 'in_progress' && (
        <div style={{
          marginTop: '2rem',
          background: 'rgba(39, 174, 96, 0.2)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #27ae60'
        }}>
          <div style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '0.5rem' }}>
            LAST PICK
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {draft.picks[draft.picks.length - 1].athlete_name}
          </div>
          <div style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
            {draft.picks[draft.picks.length - 1].school} → {draft.picks[draft.picks.length - 1].team_name}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}

export default DraftBoard;
