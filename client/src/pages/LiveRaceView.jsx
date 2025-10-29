import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSounds } from '../hooks/useSounds';

/**
 * TV-OPTIMIZED LIVE RACE VIEW
 * Large, clean view perfect for projecting onto a TV
 * Shows live race results with split-by-split analysis
 */
function LiveRaceView() {
  const { draftId } = useParams();
  const { playClick, playRefresh } = useSounds();
  const [raceData, setRaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('finish');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadRaceData();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [draftId]);

  const loadRaceData = async () => {
    try {
      playRefresh();
      const res = await fetch(`/api/live-race/${draftId}/status`);
      const data = await res.json();

      if (!data.tracking) {
        setError('No active race tracking for this draft');
        setLoading(false);
        return;
      }

      setRaceData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading race data:', err);
      setError('Failed to load race data');
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-race/${draftId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracking) {
            setRaceData(data);
          }
        }
      } catch (err) {
        console.error('Error polling race data:', err);
      }
    }, 10000); // Poll every 10 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Calculate position change for a runner between splits
  const getPositionChange = (currentPlace, previousPlace) => {
    if (!currentPlace || !previousPlace) return null;
    const change = previousPlace - currentPlace; // Positive = moved up
    return change;
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white',
        fontFamily: 'VT323, monospace'
      }}>
        Loading race data...
      </div>
    );
  }

  if (error || !raceData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white',
        padding: '2rem',
        fontFamily: 'VT323, monospace'
      }}>
        <div style={{
          background: 'rgba(231, 76, 60, 0.2)',
          padding: '2rem',
          borderRadius: '12px',
          border: '2px solid #e74c3c',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>📡 No Active Race Tracking</h2>
          <p style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
            {error || 'No live race is currently being tracked for this draft.'}
          </p>
          <div style={{ fontSize: '1.2rem', lineHeight: '2' }}>
            <p>To start tracking:</p>
            <ol style={{ paddingLeft: '2rem' }}>
              <li>Go to the Draft Room</li>
              <li>Enter a PTTiming live results URL</li>
              <li>Click "🏁 Start Live Tracking"</li>
              <li>Then return here via "📊 Full Race View"</li>
            </ol>
          </div>
        </div>
        <Link
          to={`/draft/${draftId}`}
          onClick={playClick}
          style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            background: 'var(--forest-green)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.5rem'
          }}
        >
          ← Back to Draft Room
        </Link>
      </div>
    );
  }

  // Get all unique splits across all teams (but teams will show only their own splits)
  const allAvailableSplits = (() => {
    const splits = new Set();

    // Collect all unique splits from all teams
    raceData.teamScores?.forEach(team => {
      if (team.availableSplits) {
        team.availableSplits.forEach(split => splits.add(split));
      }
    });

    // Sort splits numerically (1K, 2K, 3K, etc.)
    const sortedSplits = Array.from(splits).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });

    return ['finish', ...sortedSplits];
  })();

  // Get teams sorted by current split score
  const getSortedTeams = () => {
    if (activeTab === 'finish') {
      return raceData.teamScores;
    }
    // Show all teams that have the split available, even with 0 runners
    return raceData.teamScores
      .filter(team => team.availableSplits && team.availableSplits.includes(activeTab))
      .sort((a, b) => {
        const scoreA = a.splitScores?.[activeTab]?.score;
        const scoreB = b.splitScores?.[activeTab]?.score;
        // Teams without scores go to bottom
        if (scoreA == null && scoreB == null) return 0;
        if (scoreA == null) return 1;
        if (scoreB == null) return -1;
        return scoreA - scoreB;
      });
  };

  const sortedTeams = getSortedTeams();

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '3rem', color: 'white' }}>
              🟢 {raceData.raceTitle || 'Live Race'}
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', opacity: 0.9 }}>
              {raceData.totalResults || 0} finishers • Updated: {new Date(raceData.lastUpdate).toLocaleTimeString()}
            </p>
          </div>
          <Link
            to={`/draft/${draftId}`}
            onClick={playClick}
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Split Tabs */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '1rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {allAvailableSplits.map(split => (
            <button
              key={split}
              onClick={() => {
                playClick();
                setActiveTab(split);
              }}
              style={{
                padding: '1rem 2rem',
                background: activeTab === split ? 'var(--forest-green)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: activeTab === split ? '2px solid white' : 'none',
                borderRadius: '8px',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                minWidth: split === 'finish' ? '140px' : '100px'
              }}
            >
              {split === 'finish' ? '🏁 FINISH' : split.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Team Cards Grid */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {sortedTeams.map((team, teamIndex) => {
          // Get data for current split
          const isFinish = activeTab === 'finish';

          // For split views, check if team has calculated splitScores, otherwise build from individual runner splits
          let splitData;
          let runners;

          // Check if this team has data for the current split
          const teamHasThisSplit = isFinish || (team.availableSplits && team.availableSplits.includes(activeTab));

          // Debug logging
          if (!isFinish && teamIndex === 0) {
            console.log('Split view debug:', {
              activeTab,
              teamName: team.teamName,
              availableSplits: team.availableSplits,
              teamHasThisSplit,
              scoringRunnersCount: team.scoringRunners?.length,
              firstRunnerSplits: team.scoringRunners?.[0]?.splits ? Object.keys(team.scoringRunners[0].splits) : 'none'
            });
          }

          if (isFinish) {
            splitData = team;
            runners = [
              ...(team.scoringRunners || []).map(r => ({ ...r, isScoring: true })),
              ...(team.displacers || []).map(r => ({ ...r, isScoring: false }))
            ].sort((a, b) => (a.place || 999) - (b.place || 999));
          } else if (teamHasThisSplit) {
            // Viewing a specific split that this team has data for
            if (team.splitScores && team.splitScores[activeTab]) {
              // Team has calculated split scores (5+ runners)
              splitData = team.splitScores[activeTab];
              runners = splitData.runners || [];
            } else {
              // Team doesn't have calculated split scores, extract from individual runners
              const allRunners = [
                ...(team.scoringRunners || []),
                ...(team.displacers || [])
              ];

              // Extract split data from each runner
              runners = allRunners
                .filter(r => r.splits && r.splits[activeTab])
                .map(r => ({
                  athleteName: r.athleteName,
                  place: r.splits[activeTab].place,
                  time: r.splits[activeTab].time,
                  isScoring: team.scoringRunners?.includes(r)
                }))
                .sort((a, b) => (a.place || 999) - (b.place || 999));

              // Calculate score manually
              const top5 = runners.slice(0, 5);
              splitData = {
                score: top5.length === 5 ? top5.reduce((sum, r) => sum + (r.place || 0), 0) : null,
                avgTime: null, // Could calculate if needed
                runners: runners
              };
            }
          } else {
            // Team doesn't have this split (different race distance)
            splitData = null;
            runners = [];
          }

          // Skip rendering this team if they don't have data for the current split
          if (!teamHasThisSplit && !isFinish) {
            return null;
          }

          return (
            <div
              key={team.teamId}
              style={{
                background: teamIndex === 0
                  ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.3) 0%, rgba(243, 156, 18, 0.2) 100%)'
                  : 'rgba(255,255,255,0.05)',
                padding: '2rem',
                borderRadius: '12px',
                border: teamIndex === 0 ? '3px solid #f1c40f' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: teamIndex === 0 ? '0 0 30px rgba(241, 196, 15, 0.3)' : '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              {/* Team Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 'bold' }}>
                    {teamIndex === 0 ? '🥇' : `#${teamIndex + 1}`}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
                      {team.teamName}
                    </h2>
                    <div style={{ fontSize: '1.3rem', opacity: 0.8, marginTop: '0.25rem' }}>
                      {isFinish ? 'FINAL' : `@ ${activeTab.toUpperCase()}`}
                      {team.primaryEvent && (
                        <span style={{
                          marginLeft: '1rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(52, 152, 219, 0.3)',
                          borderRadius: '4px',
                          fontSize: '1.1rem'
                        }}>
                          {team.primaryEvent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {(isFinish && team.status === 'SCORED') || (!isFinish && splitData.score) ? (
                    <>
                      <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#27ae60', lineHeight: 1 }}>
                        {isFinish ? team.score : splitData.score}
                      </div>
                      <div style={{ fontSize: '1.3rem', opacity: 0.8 }}>points</div>
                      <div style={{ fontSize: '1.2rem', opacity: 0.7, marginTop: '0.5rem' }}>
                        Avg: {isFinish ? team.avgTime : splitData.avgTime}
                      </div>
                    </>
                  ) : (
                    <div style={{
                      padding: '1rem 2rem',
                      background: '#e74c3c',
                      borderRadius: '8px',
                      fontSize: '1.8rem',
                      fontWeight: 'bold'
                    }}>
                      DNF
                    </div>
                  )}
                </div>
              </div>

              {/* Runner Table */}
              {runners.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '1.3rem'
                  }}>
                    <thead>
                      <tr style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderBottom: '2px solid rgba(255,255,255,0.3)'
                      }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Place</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Runner</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                          {isFinish ? 'Time' : 'Split'}
                        </th>
                        {!isFinish && (
                          <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Δ</th>
                        )}
                        {isFinish && (
                          <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Score</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {runners.map((runner, idx) => {
                        // Calculate position change for splits
                        let positionChange = null;
                        if (!isFinish) {
                          const splitIndex = allAvailableSplits.indexOf(activeTab);
                          if (splitIndex > 1) {
                            const prevSplit = allAvailableSplits[splitIndex - 1];
                            const prevSplitData = team.splitScores?.[prevSplit];
                            if (prevSplitData && prevSplitData.runners) {
                              const prevRunner = prevSplitData.runners.find(r => r.athleteName === runner.athleteName);
                              if (prevRunner && prevRunner.place && runner.place) {
                                positionChange = getPositionChange(runner.place, prevRunner.place);
                              }
                            }
                          }
                        }

                        return (
                          <tr key={idx} style={{
                            background: isFinish && runner.isScoring ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <td style={{
                              padding: '1rem',
                              fontWeight: 'bold',
                              fontSize: '1.8rem',
                              color: (isFinish && runner.isScoring) || !isFinish ? '#27ae60' : '#999'
                            }}>
                              #{runner.place}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {runner.athleteName}
                              </div>
                              {isFinish && runner.school && (
                                <div style={{ fontSize: '1.1rem', opacity: 0.7, marginTop: '0.25rem' }}>
                                  {runner.school}
                                </div>
                              )}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontFamily: 'monospace',
                              fontSize: '1.5rem',
                              fontWeight: 'bold'
                            }}>
                              {runner.time || '-'}
                            </td>
                            {!isFinish && (
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                {positionChange !== null ? (
                                  <span style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '1.3rem',
                                    background: positionChange > 0 ? '#27ae60' : positionChange < 0 ? '#e74c3c' : 'rgba(255,255,255,0.1)',
                                    color: 'white'
                                  }}>
                                    {positionChange > 0 ? `↑${positionChange}` : positionChange < 0 ? `↓${Math.abs(positionChange)}` : '−'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#666', fontSize: '1.5rem' }}>−</span>
                                )}
                              </td>
                            )}
                            {isFinish && (
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                {runner.isScoring ? (
                                  <span style={{
                                    background: '#27ae60',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem'
                                  }}>
                                    ✓
                                  </span>
                                ) : (
                                  <span style={{
                                    background: '#666',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    fontSize: '1.2rem'
                                  }}>
                                    −
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Team Stats */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-around',
                fontSize: '1.3rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <strong>Gap 1-5:</strong> {isFinish ? team.gap1to5 : splitData.gap1to5}
                </div>
                <div>
                  <strong>Gap 1-7:</strong> {isFinish ? team.gap1to7 : splitData.gap1to7}
                </div>
                {isFinish && team.totalFinishers && (
                  <div>
                    <strong>Finishers:</strong> {team.totalFinishers}/7
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveRaceView;
