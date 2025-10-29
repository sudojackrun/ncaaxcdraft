import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSounds } from '../hooks/useSounds';

function LiveRaceTracker({ draftId }) {
  const { playClick } = useSounds();
  const [tracking, setTracking] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [activeTab, setActiveTab] = useState('finish'); // 'finish', '1K', '2K', etc.
  const pollIntervalRef = useRef(null);

  // Check if already tracking on mount
  useEffect(() => {
    checkTrackingStatus();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [draftId]);

  const checkTrackingStatus = async () => {
    try {
      const res = await fetch(`/api/live-race/${draftId}/status`);
      const data = await res.json();

      if (data.tracking) {
        setTracking(true);
        setRaceData(data);
        startPolling();
      }
    } catch (err) {
      console.error('Error checking tracking status:', err);
    }
  };

  const startTracking = async () => {
    if (!liveUrl.includes('pttiming.com')) {
      setError('Please enter a valid PTTiming URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-race/${draftId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveResultsUrl: liveUrl })
      });

      const data = await res.json();

      if (res.ok) {
        setTracking(true);
        setRaceData(data.raceData);
        startPolling();
      } else {
        setError(data.error || 'Failed to start tracking');
      }
    } catch (err) {
      console.error('Error starting tracking:', err);
      setError('Failed to start tracking');
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    try {
      await fetch(`/api/live-race/${draftId}/stop`, { method: 'POST' });
      setTracking(false);
      setRaceData(null);
      stopPolling();
    } catch (err) {
      console.error('Error stopping tracking:', err);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-race/${draftId}/status`);

        // Only process if response is OK
        if (!res.ok) {
          console.error('Failed to fetch race status:', res.status);
          return; // Keep polling, don't exit
        }

        const data = await res.json();

        // Only update if tracking is true
        if (data.tracking) {
          setRaceData(data);
        }
        // Don't exit tracking mode on errors - keep polling
      } catch (err) {
        console.error('Error polling race data:', err);
        // Keep polling even on errors
      }
    }, 10000); // Poll every 10 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadDebugData = async () => {
    try {
      const res = await fetch(`/api/live-race/${draftId}/debug`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('Debug data loaded:', data);
      setDebugData(data);
      setShowDebug(true);
    } catch (err) {
      console.error('Error loading debug data:', err);
      setError(`Failed to load debug data: ${err.message}`);
    }
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2>📡 Live Race Tracking</h2>

      {!tracking ? (
        <div>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Track live race results and see your draft team scores update in real-time
          </p>

          <div className="form-group">
            <label className="form-label">Live Results URL</label>
            <input
              type="url"
              className="form-input"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://live.pttiming.com/xc-ptt.html?mid=7388"
              disabled={loading}
            />
            <small className="text-muted">
              Enter a PTTiming live results URL (live.pttiming.com)
            </small>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-success"
            onClick={startTracking}
            disabled={loading || !liveUrl}
          >
            {loading ? 'Starting...' : '🏁 Start Live Tracking'}
          </button>
        </div>
      ) : (
        <div>
          {/* Race Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#27ae60' }}>
                🟢 LIVE: {raceData?.raceTitle || 'Race in Progress'}
              </h3>
              <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>
                {raceData?.totalResults || 0} finishers • Updated: {new Date(raceData?.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link
                to={`/draft/${draftId}/live-race`}
                className="btn btn-primary"
                onClick={playClick}
              >
                📊 Full Race View
              </Link>
              <button className="btn btn-secondary" onClick={loadDebugData}>
                🔍 Debug Data
              </button>
              <button className="btn btn-danger" onClick={stopTracking}>
                Stop Tracking
              </button>
            </div>
          </div>

          {/* Split Tabs */}
          {raceData?.teamScores && raceData.teamScores.length > 0 && (
            <>
              {/* Get available splits from all teams */}
              {(() => {
                const splits = new Set();
                raceData.teamScores?.forEach(team => {
                  if (team.availableSplits) {
                    team.availableSplits.forEach(split => splits.add(split));
                  }
                });

                const sortedSplits = Array.from(splits).sort((a, b) => {
                  const numA = parseInt(a);
                  const numB = parseInt(b);
                  return numA - numB;
                });

                const availableSplits = ['finish', ...sortedSplits];

                return (
                  <>
                    {/* Tab Navigation */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginBottom: '1.5rem',
                      overflowX: 'auto',
                      background: 'var(--beige)',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '2px solid var(--pixel-black)'
                    }}>
                      {availableSplits.map(split => (
                        <button
                          key={split}
                          onClick={() => setActiveTab(split)}
                          className="btn"
                          style={{
                            background: activeTab === split ? 'var(--forest-green)' : 'var(--pixel-gray)',
                            color: 'white',
                            fontWeight: 'bold',
                            minWidth: split === 'finish' ? '100px' : '70px',
                            padding: '0.75rem 1rem',
                            fontSize: '1rem'
                          }}
                        >
                          {split === 'finish' ? 'FINISH' : split.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* Team Scores Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ background: 'var(--beige)' }}>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Score</th>
                            <th>Avg Time</th>
                            <th>Gap 1-5</th>
                            <th>Gap 1-7</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeTab === 'finish' ? (
                            // Finish line scores
                            raceData.teamScores.map((team, index) => (
                              <tr key={team.teamId} style={{
                                background: index === 0 && team.status === 'SCORED' ? '#fff3cd' : 'white'
                              }}>
                                <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>#{index + 1}</td>
                                <td><strong>{team.teamName}</strong></td>
                                <td>
                                  {team.status === 'SCORED' ? (
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#27ae60' }}>
                                      {team.score}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>DNF</span>
                                  )}
                                </td>
                                <td>{team.avgTime || '-'}</td>
                                <td>{team.gap1to5 !== null ? team.gap1to5 : '-'}</td>
                                <td>{team.gap1to7 !== null ? team.gap1to7 : '-'}</td>
                              </tr>
                            ))
                          ) : (
                            // Split scores
                            raceData.teamScores
                              .filter(team => team.splitScores && team.splitScores[activeTab])
                              .sort((a, b) => a.splitScores[activeTab].score - b.splitScores[activeTab].score)
                              .map((team, index) => {
                                const splitData = team.splitScores[activeTab];
                                return (
                                  <tr key={team.teamId} style={{
                                    background: index === 0 ? '#e8f5e9' : 'white'
                                  }}>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>#{index + 1}</td>
                                    <td><strong>{team.teamName}</strong></td>
                                    <td>
                                      <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2e7d32' }}>
                                        {splitData.score}
                                      </span>
                                    </td>
                                    <td>{splitData.avgTime || '-'}</td>
                                    <td>{splitData.gap1to5 !== null ? splitData.gap1to5 : '-'}</td>
                                    <td>{splitData.gap1to7 !== null ? splitData.gap1to7 : '-'}</td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Expanded Runner Details */}
                    <div style={{ marginTop: '2rem' }}>
                      <h3 style={{ marginBottom: '1rem' }}>Runner Details - {activeTab === 'finish' ? 'FINISH' : activeTab.toUpperCase()}</h3>
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {activeTab === 'finish' ? (
                          // Finish line runner details
                          raceData.teamScores.map((team, index) => (
                            <div
                              key={team.teamId}
                              style={{
                                border: team.status === 'DNF' ? '2px solid #e74c3c' : '2px solid #27ae60',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                background: index === 0 && team.status === 'SCORED' ? 'linear-gradient(135deg, #f9f9f9 0%, #fff3cd 100%)' : '#f8f9fa'
                              }}
                            >
                              {/* Team Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#666' }}>
                                    #{index + 1}
                                  </span>
                                  <h3 style={{ margin: 0 }}>{team.teamName}</h3>
                                </div>
                                <div>
                                  {team.status === 'SCORED' ? (
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>
                                        {team.score}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#666' }}>points</div>
                                    </div>
                                  ) : (
                                    <div style={{ padding: '0.5rem 1rem', background: '#e74c3c', color: 'white', borderRadius: '6px', fontWeight: 'bold' }}>
                                      DNF
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* DNF Reason */}
                              {team.status === 'DNF' && (
                                <div style={{ padding: '0.75rem', background: '#fff3cd', borderRadius: '6px', marginBottom: '1rem' }}>
                                  ⚠️ {team.reason}
                                </div>
                              )}

                              {/* Scoring Runners */}
                              {team.scoringRunners && team.scoringRunners.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '0.875rem', color: '#666' }}>Scoring Runners (Top 5):</strong>
                                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {team.scoringRunners.map((runner, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          padding: '0.75rem',
                                          background: 'white',
                                          borderRadius: '6px',
                                          border: '1px solid #e0e0e0'
                                        }}
                                      >
                                        <div>
                                          <strong>{runner.athleteName}</strong>
                                          <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                                            ({runner.school})
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                          <span style={{ fontWeight: 'bold', color: '#27ae60' }}>#{runner.place}</span>
                                          <span style={{ color: '#666' }}>{runner.time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Displacers */}
                              {team.displacers && team.displacers.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                  <strong style={{ fontSize: '0.875rem', color: '#666' }}>Displacers (6th & 7th):</strong>
                                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {team.displacers.map((runner, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          padding: '0.75rem',
                                          background: '#f8f9fa',
                                          borderRadius: '6px',
                                          border: '1px solid #e0e0e0'
                                        }}
                                      >
                                        <div>
                                          <strong>{runner.athleteName}</strong>
                                          <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                                            ({runner.school})
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                          <span style={{ fontWeight: 'bold', color: '#666' }}>#{runner.place}</span>
                                          <span style={{ color: '#666' }}>{runner.time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          // Split-specific runner details
                          raceData.teamScores
                            .filter(team => team.splitScores && team.splitScores[activeTab])
                            .sort((a, b) => a.splitScores[activeTab].score - b.splitScores[activeTab].score)
                            .map((team, index) => {
                              const splitData = team.splitScores[activeTab];
                              return (
                                <div
                                  key={team.teamId}
                                  style={{
                                    border: '2px solid #2e7d32',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    background: index === 0 ? 'linear-gradient(135deg, #f9f9f9 0%, #e8f5e9 100%)' : '#f8f9fa'
                                  }}
                                >
                                  {/* Team Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#666' }}>
                                        #{index + 1}
                                      </span>
                                      <h3 style={{ margin: 0 }}>{team.teamName}</h3>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32' }}>
                                        {splitData.score}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#666' }}>points @ {activeTab.toUpperCase()}</div>
                                    </div>
                                  </div>

                                  {/* Scoring Runners at Split */}
                                  {splitData.runners && splitData.runners.length > 0 && (
                                    <div>
                                      <strong style={{ fontSize: '0.875rem', color: '#666' }}>Scoring Runners (Top 5 @ {activeTab.toUpperCase()}):</strong>
                                      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {splitData.runners.map((runner, idx) => (
                                          <div
                                            key={idx}
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              padding: '0.75rem',
                                              background: 'white',
                                              borderRadius: '6px',
                                              border: '1px solid #e0e0e0'
                                            }}
                                          >
                                            <div>
                                              <strong>{runner.athleteName}</strong>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                              <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>#{runner.place}</span>
                                              <span style={{ color: '#666' }}>{runner.time}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Debug Modal */}
          {showDebug && debugData && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '1200px',
                maxHeight: '80vh',
                overflow: 'auto',
                width: '100%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2>🔍 Debug Data</h2>
                  <button className="btn btn-secondary" onClick={() => setShowDebug(false)}>
                    Close
                  </button>
                </div>

                {debugData.sampleLiveResults && debugData.sampleLiveResults.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '2rem' }}>
                      <h3>Live Results ({debugData.totalLiveResults || 0} total)</h3>
                      <p className="text-muted">First 20 results from PTTiming:</p>
                      <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem', background: '#f8f9fa' }}>
                        {debugData.sampleLiveResults.map((result, idx) => (
                          <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            <strong>#{result.place}</strong> {result.name} <span style={{ color: '#666' }}>({result.school})</span> - {result.time}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3>Team Rosters</h3>
                      {debugData.teamRosters && debugData.teamRosters.map(team => (
                        <div key={team.teamId} style={{ marginBottom: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem', background: '#f8f9fa' }}>
                          <h4>{team.teamName}</h4>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {team.roster && team.roster.map((athlete, idx) => (
                              <div key={idx} style={{ padding: '0.25rem 0' }}>
                                • {athlete.name} <span style={{ color: '#666' }}>({athlete.school}) - {athlete.gender}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '6px' }}>
                      <strong>💡 Troubleshooting Tips:</strong>
                      <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                        <li>Check if names match exactly between live results and roster</li>
                        <li>Look for differences in school names (abbreviations, spellings)</li>
                        <li>Verify gender filter matches the race being tracked</li>
                        <li>Check server logs for detailed matching attempts</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>No debug data available. The race might not be tracking yet.</p>
                    <pre style={{ textAlign: 'left', background: '#f8f9fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveRaceTracker;
