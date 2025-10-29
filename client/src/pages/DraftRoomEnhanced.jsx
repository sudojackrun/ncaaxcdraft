import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import LiveRaceTracker from '../components/LiveRaceTracker';

const PICK_TIME_SECONDS = 120; // 2 minutes

function DraftRoomEnhanced() {
  const { id } = useParams();
  const [draft, setDraft] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortBy, setSortBy] = useState('8k'); // '8k' or '10k'
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(PICK_TIME_SECONDS);
  const [pickStartTime, setPickStartTime] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadDraft();
    loadAthletes();

    // Setup WebSocket connection
    const websocket = new WebSocket(`ws://localhost:3001/ws`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'draft_update' && data.draftId === parseInt(id)) {
        loadDraft();
        loadAthletes();
        // Reset timer for next pick
        setPickStartTime(Date.now());
        setTimeRemaining(PICK_TIME_SECONDS);
      }
    };

    setWs(websocket);

    return () => {
      if (websocket) websocket.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Timer countdown effect
  useEffect(() => {
    if (draft?.status === 'in_progress' && getCurrentTeam()) {
      if (!pickStartTime) {
        setPickStartTime(Date.now());
      }

      // Clear any existing timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Start new timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - pickStartTime) / 1000);
        const remaining = PICK_TIME_SECONDS - elapsed;

        if (remaining <= 0) {
          setTimeRemaining(0);
          clearInterval(timerRef.current);
          // Auto-draft
          autoDraft();
        } else {
          setTimeRemaining(remaining);
        }
      }, 100); // Update every 100ms for smooth countdown

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeRemaining(PICK_TIME_SECONDS);
    }
  }, [draft?.status, pickStartTime, draft?.current_round, draft?.picks?.length]);

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

  const loadAthletes = async () => {
    try {
      const params = new URLSearchParams({
        available: 'true',
        draftId: id
      });

      // Use draft gender if available (draft-specific gender filtering)
      if (draft?.gender) {
        params.append('gender', draft.gender);
      } else if (genderFilter) {
        // Fallback to manual gender filter
        params.append('gender', genderFilter);
      }

      const res = await fetch(`/api/athletes?${params}`);
      const data = await res.json();
      // Sort by ranking
      const sorted = data.sort((a, b) => {
        if (!a.ranking && !b.ranking) return 0;
        if (!a.ranking) return 1;
        if (!b.ranking) return -1;
        return a.ranking - b.ranking;
      });
      setAthletes(sorted);
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  useEffect(() => {
    if (id) loadAthletes();
  }, [genderFilter, id, draft?.gender]);

  const startDraft = async () => {
    try {
      await fetch(`/api/draft/${id}/start`, { method: 'POST' });
      setPickStartTime(Date.now());
      loadDraft();
    } catch (error) {
      console.error('Error starting draft:', error);
    }
  };

  const makePick = async (athleteId) => {
    const currentTeam = getCurrentTeam();
    if (!athleteId || !currentTeam) return;

    try {
      await fetch(`/api/draft/${id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: currentTeam.team_id,
          athlete_id: athleteId
        })
      });

      setSelectedAthlete(null);
      setPickStartTime(Date.now());
      loadDraft();
      loadAthletes();
    } catch (error) {
      console.error('Error making pick:', error);
      alert(error.message || 'Failed to make pick');
    }
  };

  const autoDraft = async () => {
    if (!athletes || athletes.length === 0) return;

    // Get the highest ranked available athlete
    const topAthlete = athletes.find(a => a.ranking) || athletes[0];

    if (topAthlete) {
      console.log(`AUTO-DRAFTING: ${topAthlete.name} (Rank #${topAthlete.ranking || 'Unranked'})`);
      await makePick(topAthlete.id);
    }
  };

  const undoPick = async () => {
    try {
      await fetch(`/api/draft/${id}/undo`, { method: 'POST' });
      setPickStartTime(Date.now());
      loadDraft();
      loadAthletes();
    } catch (error) {
      console.error('Error undoing pick:', error);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 60) return '#27ae60'; // Green
    if (timeRemaining > 30) return '#f39c12'; // Orange
    return '#e74c3c'; // Red
  };

  if (loading) {
    return <div className="loading">Loading draft...</div>;
  }

  if (!draft) {
    return <div className="container"><div className="card">Draft not found</div></div>;
  }

  const currentTeam = draft.status === 'in_progress' ? getCurrentTeam() : null;
  const filteredAthletes = athletes
    .filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.school.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by selected time (5k, 6k, 8k, or 10k)
      const timeField = sortBy === '5k' ? 'pr_5k_seconds' :
                        sortBy === '6k' ? 'pr_6k_seconds' :
                        sortBy === '8k' ? 'pr_8k_seconds' : 'pr_10k_seconds';

      // Handle null/undefined times - push them to the end
      const aTime = a[timeField];
      const bTime = b[timeField];

      if (aTime == null && bTime == null) return 0;
      if (aTime == null) return 1;
      if (bTime == null) return -1;

      // Sort ascending (faster times first)
      return aTime - bTime;
    });

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '1rem', background: 'var(--forest-green)', color: 'white' }}>
        <div className="flex-between">
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>{draft.name}</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              Round {draft.current_round} of {draft.total_rounds} |
              Status: <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)',
                marginLeft: '0.5rem'
              }}>
                {draft.status === 'completed' ? '🏆 Completed' :
                 draft.status === 'in_progress' ? '🔴 Live' : '⏸️ Not Started'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              to={`/draft/${id}/board`}
              className="btn"
              style={{ background: 'var(--burnt-orange)', color: 'white', textDecoration: 'none' }}
              target="_blank"
            >
              📺 TV Board
            </Link>
            {draft.status === 'in_progress' && draft.picks.length > 0 && (
              <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={undoPick}>
                ↩️ Undo Last Pick
              </button>
            )}
          </div>
        </div>
      </div>

      {/* On The Clock Banner */}
      {currentTeam && (
        <div className="card" style={{
          background: getTimerColor(),
          color: 'white',
          padding: '2rem',
          marginBottom: '1rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', opacity: 0.9, color: 'white' }}>ON THE CLOCK</h2>
            <h1 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
              {currentTeam.team_name}
            </h1>
            <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9, color: 'white' }}>
              Owner: {currentTeam.owner_name}
            </p>
            <div style={{ marginTop: '1.5rem', fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'white' }}>
              {formatTime(timeRemaining)}
            </div>
            {timeRemaining <= 10 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                ⚠️ Auto-draft will select highest ranked athlete when time expires
              </div>
            )}
          </div>
          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '4px',
            width: `${(timeRemaining / PICK_TIME_SECONDS) * 100}%`,
            background: 'white',
            transition: 'width 0.1s linear'
          }}></div>
        </div>
      )}

      {draft.status === 'setup' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Draft Order</h2>
          <p className="text-muted">Review the draft order below and click "Start Draft" when ready</p>
          <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
            {draft.draftOrder.map((team, index) => (
              <div key={team.team_id} className="card mb-2" style={{ padding: '1rem' }}>
                <strong style={{ fontSize: '1.2rem' }}>{index + 1}. {team.team_name}</strong>
                <span className="text-muted" style={{ marginLeft: '0.5rem' }}>({team.owner_name})</span>
              </div>
            ))}
          </div>
          <button className="btn btn-success" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }} onClick={startDraft}>
            🚀 Start Draft
          </button>
        </div>
      )}

      {draft.status !== 'setup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Left Column - Available Athletes */}
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Available Athletes</h2>
            <input
              type="text"
              className="form-input mb-2"
              placeholder="🔍 Search by name or school..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                className={`btn ${genderFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGenderFilter('')}
                style={{ flex: 1 }}
              >
                All
              </button>
              <button
                className={`btn ${genderFilter === 'M' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGenderFilter('M')}
                style={{ flex: 1 }}
              >
                Men
              </button>
              <button
                className={`btn ${genderFilter === 'F' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGenderFilter('F')}
                style={{ flex: 1 }}
              >
                Women
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                className={`btn ${sortBy === '5k' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSortBy('5k')}
                style={{ flex: 1 }}
              >
                Sort by 5K
              </button>
              <button
                className={`btn ${sortBy === '6k' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSortBy('6k')}
                style={{ flex: 1 }}
              >
                Sort by 6K
              </button>
              <button
                className={`btn ${sortBy === '8k' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSortBy('8k')}
                style={{ flex: 1 }}
              >
                Sort by 8K
              </button>
              <button
                className={`btn ${sortBy === '10k' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSortBy('10k')}
                style={{ flex: 1 }}
              >
                Sort by 10K
              </button>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredAthletes.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  No available athletes
                </p>
              ) : (
                filteredAthletes.map(athlete => (
                  <div
                    key={athlete.id}
                    className="card"
                    style={{
                      marginBottom: '0.5rem',
                      padding: '1rem',
                      cursor: currentTeam ? 'pointer' : 'default',
                      border: selectedAthlete?.id === athlete.id ? '2px solid #3498db' : '1px solid #e0e0e0',
                      background: selectedAthlete?.id === athlete.id ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => currentTeam && setSelectedAthlete(athlete)}
                    onMouseEnter={(e) => currentTeam && (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={(e) => !selectedAthlete || selectedAthlete.id !== athlete.id ? (e.currentTarget.style.background = 'white') : null}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {athlete.ranking && (
                            <span style={{
                              background: athlete.ranking <= 10 ? '#f39c12' : athlete.ranking <= 50 ? '#3498db' : '#95a5a6',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              #{athlete.ranking}
                            </span>
                          )}
                          <strong style={{ fontSize: '1.1rem' }}>{athlete.name}</strong>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#333', marginTop: '0.25rem' }}>
                          {athlete.school} | {athlete.grade || 'N/A'} | {athlete.gender}
                        </div>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {athlete.pr_5k && (
                            <span style={{
                              fontWeight: sortBy === '5k' ? 'bold' : 'normal',
                              color: sortBy === '5k' ? '#3498db' : '#333',
                              marginRight: '0.5rem'
                            }}>
                              5K: {athlete.pr_5k}
                            </span>
                          )}
                          {athlete.pr_5k && (athlete.pr_6k || athlete.pr_8k || athlete.pr_10k) && <span style={{ color: '#999', marginRight: '0.5rem' }}>|</span>}
                          {athlete.pr_6k && (
                            <span style={{
                              fontWeight: sortBy === '6k' ? 'bold' : 'normal',
                              color: sortBy === '6k' ? '#3498db' : '#333',
                              marginRight: '0.5rem'
                            }}>
                              6K: {athlete.pr_6k}
                            </span>
                          )}
                          {athlete.pr_6k && (athlete.pr_8k || athlete.pr_10k) && <span style={{ color: '#999', marginRight: '0.5rem' }}>|</span>}
                          {athlete.pr_8k && (
                            <span style={{
                              fontWeight: sortBy === '8k' ? 'bold' : 'normal',
                              color: sortBy === '8k' ? '#3498db' : '#333',
                              marginRight: '0.5rem'
                            }}>
                              8K: {athlete.pr_8k}
                            </span>
                          )}
                          {athlete.pr_8k && athlete.pr_10k && <span style={{ color: '#999', marginRight: '0.5rem' }}>|</span>}
                          {athlete.pr_10k && (
                            <span style={{
                              fontWeight: sortBy === '10k' ? 'bold' : 'normal',
                              color: sortBy === '10k' ? '#3498db' : '#333'
                            }}>
                              10K: {athlete.pr_10k}
                            </span>
                          )}
                          {!athlete.pr_5k && !athlete.pr_6k && !athlete.pr_8k && !athlete.pr_10k && <span style={{ color: '#999' }}>No PR times</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {currentTeam && selectedAthlete && (
              <button
                className="btn btn-success"
                style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem', padding: '0.75rem' }}
                onClick={() => makePick(selectedAthlete.id)}
              >
                ✅ Draft {selectedAthlete.name}
              </button>
            )}
          </div>

          {/* Right Column - Draft Board & Teams */}
          <div>
            {/* Recent Picks */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Recent Picks</h2>
              {draft.picks.length === 0 ? (
                <p className="text-muted">No picks yet</p>
              ) : (
                <div>
                  {draft.picks.slice(-5).reverse().map((pick, index) => (
                    <div
                      key={pick.id}
                      className="card"
                      style={{
                        marginBottom: '0.5rem',
                        padding: '0.75rem',
                        background: index === 0 ? '#d4edda' : 'white',
                        border: index === 0 ? '2px solid #27ae60' : '1px solid #e0e0e0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>Pick {pick.overall_pick}</strong> (Rd {pick.round})
                          <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {pick.athlete_name} - {pick.school}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#333' }}>
                          {pick.team_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teams & Rosters */}
            <div className="card">
              <h2 style={{ marginBottom: '1rem' }}>Teams & Rosters</h2>
              {draft.teams.map(team => {
                const teamPicks = draft.picks.filter(p => p.team_id === team.id);
                return (
                  <div key={team.id} className="card mb-2" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{team.name}</h3>
                        <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                          {team.owner_name}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                          {teamPicks.length}/{draft.total_rounds}
                        </div>
                        <Link
                          to={`/team/${team.id}`}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginTop: '0.25rem' }}
                        >
                          View Roster
                        </Link>
                      </div>
                    </div>
                    {teamPicks.length > 0 && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
                        {teamPicks.map(pick => (
                          <div key={pick.id} style={{ padding: '0.25rem 0', color: '#333' }}>
                            R{pick.round}: {pick.athlete_name} ({pick.school})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Live Race Tracking */}
      <LiveRaceTracker draftId={id} />
    </div>
  );
}

export default DraftRoomEnhanced;
