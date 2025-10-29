import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSounds } from '../hooks/useSounds';

function DraftRoom() {
  const { id } = useParams();
  const { playClick, playDraftPick, playStartDraft } = useSounds();
  const [draft, setDraft] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortBy, setSortBy] = useState('8k'); // '8k' or '10k'
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const init = async () => {
      await loadDraft();
      await loadAthletes();
    };
    init();

    // Setup WebSocket connection
    const websocket = new WebSocket(`ws://localhost:3001/ws`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'draft_update' && data.draftId === parseInt(id)) {
        loadDraft();
        loadAthletes(); // Refresh to remove picked athletes
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
      // Auto-set gender filter from draft
      if (data.gender && !genderFilter) {
        setGenderFilter(data.gender);
      }
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
      if (genderFilter) params.append('gender', genderFilter);

      const res = await fetch(`/api/athletes?${params}`);
      const data = await res.json();
      setAthletes(data);
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  useEffect(() => {
    if (id) loadAthletes();
  }, [genderFilter, id]);

  const startDraft = async () => {
    try {
      playStartDraft();
      await fetch(`/api/draft/${id}/start`, { method: 'POST' });
      loadDraft();
    } catch (error) {
      console.error('Error starting draft:', error);
    }
  };

  const makePick = async () => {
    if (!selectedAthlete || !currentTeam) return;

    try {
      playDraftPick();
      await fetch(`/api/draft/${id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: currentTeam.team_id,
          athlete_id: selectedAthlete.id
        })
      });

      setSelectedAthlete(null);
      loadDraft();
      loadAthletes();
    } catch (error) {
      console.error('Error making pick:', error);
      alert(error.message || 'Failed to make pick');
    }
  };

  const undoPick = async () => {
    try {
      playClick();
      await fetch(`/api/draft/${id}/undo`, { method: 'POST' });
      loadDraft();
      loadAthletes();
    } catch (error) {
      console.error('Error undoing pick:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading draft...</div>;
  }

  if (!draft) {
    return <div className="container"><div className="card">Draft not found</div></div>;
  }

  // Calculate current team on the clock
  const getCurrentTeam = () => {
    if (!draft.draftOrder || draft.draftOrder.length === 0) return null;

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

  const currentTeam = draft.status === 'in_progress' ? getCurrentTeam() : null;

  const filteredAthletes = athletes
    .filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.school.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by selected time (8k or 10k)
      const timeField = sortBy === '8k' ? 'pr_8k_seconds' : 'pr_10k_seconds';

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
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex-between">
            <div>
              <h1 className="card-title">{draft.name}</h1>
              <p className="text-muted">
                Round {draft.current_round} of {draft.total_rounds} |
                Status: <span className={`badge badge-${
                  draft.status === 'completed' ? 'success' :
                  draft.status === 'in_progress' ? 'warning' : 'info'
                }`}>
                  {draft.status}
                </span>
              </p>
            </div>
            {draft.status === 'setup' && (
              <button className="btn btn-success" onClick={startDraft}>
                Start Draft
              </button>
            )}
            {draft.status === 'in_progress' && draft.picks.length > 0 && (
              <button className="btn btn-danger" onClick={undoPick}>
                Undo Last Pick
              </button>
            )}
          </div>
        </div>

        {currentTeam && (
          <div className="card" style={{ background: '#d4edda', border: '2px solid #27ae60' }}>
            <h2>On the Clock</h2>
            <h3>{currentTeam.team_name}</h3>
            <p className="text-muted">Owner: {currentTeam.owner_name}</p>
          </div>
        )}

        {draft.status !== 'setup' && (
          <div className="draft-board">
            <div>
              <div className="card">
                <h2>Available Athletes</h2>
                <input
                  type="text"
                  className="form-input mb-2"
                  placeholder="Search athletes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <select
                  className="form-select mb-2"
                  value={genderFilter}
                  onChange={e => setGenderFilter(e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="M">Men</option>
                  <option value="F">Women</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    className={`btn ${sortBy === '8k' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      playClick();
                      setSortBy('8k');
                    }}
                    style={{ flex: 1 }}
                  >
                    Sort by 8K
                  </button>
                  <button
                    className={`btn ${sortBy === '10k' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      playClick();
                      setSortBy('10k');
                    }}
                    style={{ flex: 1 }}
                  >
                    Sort by 10K
                  </button>
                </div>
                <div className="athlete-list">
                  {filteredAthletes.map(athlete => (
                    <div
                      key={athlete.id}
                      className={`athlete-item ${selectedAthlete?.id === athlete.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAthlete(athlete)}
                    >
                      <div><strong>{athlete.name}</strong></div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {athlete.school} | {athlete.gender}
                      </div>
                      <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {athlete.pr_8k && (
                          <span style={{ fontWeight: sortBy === '8k' ? 'bold' : 'normal', color: sortBy === '8k' ? '#3498db' : '#666' }}>
                            8K: {athlete.pr_8k}
                          </span>
                        )}
                        {athlete.pr_8k && athlete.pr_10k && <span style={{ margin: '0 0.5rem', color: '#999' }}>|</span>}
                        {athlete.pr_10k && (
                          <span style={{ fontWeight: sortBy === '10k' ? 'bold' : 'normal', color: sortBy === '10k' ? '#3498db' : '#666' }}>
                            10K: {athlete.pr_10k}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {currentTeam && selectedAthlete && (
                  <button
                    className="btn btn-primary mt-2"
                    style={{ width: '100%' }}
                    onClick={makePick}
                  >
                    Draft {selectedAthlete.name}
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="card">
                <h2>Draft Picks</h2>
                {draft.picks.length === 0 ? (
                  <p className="text-muted">No picks yet</p>
                ) : (
                  <div className="picks-grid">
                    {draft.picks.map(pick => (
                      <div key={pick.id} className="pick-card">
                        <div>
                          <div><strong>Pick {pick.overall_pick}</strong> (Round {pick.round})</div>
                          <div>{pick.athlete_name} - {pick.school}</div>
                        </div>
                        <div className="text-muted">{pick.team_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card mt-2">
                <h2>Teams & Rosters</h2>
                {draft.teams.map(team => {
                  const teamPicks = draft.picks.filter(p => p.team_name === team.name);
                  return (
                    <div key={team.id} className="card mb-2">
                      <h3>{team.name}</h3>
                      <p className="text-muted">Owner: {team.owner_name}</p>
                      <p className="text-muted">Picks: {teamPicks.length}/{draft.total_rounds}</p>
                      {teamPicks.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {teamPicks.map(pick => (
                            <div key={pick.id} style={{ padding: '0.25rem 0', fontSize: '0.875rem' }}>
                              R{pick.round}: {pick.athlete_name}
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

        {draft.status === 'setup' && (
          <div className="text-center" style={{ padding: '2rem' }}>
            <h2>Draft Order</h2>
            {draft.draftOrder.map((team, index) => (
              <div key={team.team_id} className="card mb-2">
                <strong>{index + 1}. {team.team_name}</strong> ({team.owner_name})
              </div>
            ))}
            <button className="btn btn-success mt-3" onClick={startDraft}>
              Start Draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DraftRoom;
