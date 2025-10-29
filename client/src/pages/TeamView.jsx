import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function TeamView() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      const data = await res.json();
      setTeam(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading team:', error);
      setLoading(false);
    }
  };

  const calculateTeamStats = (roster) => {
    if (!roster || roster.length === 0) return null;

    const rankedAthletes = roster.filter(a => a.ranking);
    const avgRanking = rankedAthletes.length > 0
      ? Math.round(rankedAthletes.reduce((sum, a) => sum + a.ranking, 0) / rankedAthletes.length)
      : null;

    const best5K = roster
      .filter(a => a.pr_5k_seconds)
      .sort((a, b) => a.pr_5k_seconds - b.pr_5k_seconds)[0]?.pr_5k;

    return { avgRanking, best5K, totalAthletes: roster.length };
  };

  const getRankBadgeStyle = (ranking) => {
    if (!ranking) return { backgroundColor: '#95a5a6', color: 'white' };
    if (ranking <= 10) return { backgroundColor: '#f39c12', color: 'white' };
    if (ranking <= 50) return { backgroundColor: '#3498db', color: 'white' };
    return { backgroundColor: '#95a5a6', color: 'white' };
  };

  if (loading) {
    return <div className="loading">Loading team...</div>;
  }

  if (!team) {
    return <div className="container"><div className="card">Team not found</div></div>;
  }

  const stats = calculateTeamStats(team.roster);

  return (
    <div className="container">
      {/* Header Banner */}
      <div style={{
        background: 'var(--forest-green)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{team.name}</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>Owner: {team.owner_name}</p>
          </div>
          {team.draft_id && (
            <Link to={`/draft/${team.draft_id}`} className="btn" style={{
              background: 'white',
              color: 'var(--forest-green)',
              padding: '0.75rem 1.5rem',
              fontWeight: 'bold',
              textDecoration: 'none',
              borderRadius: '8px'
            }}>
              Back to Draft
            </Link>
          )}
        </div>
      </div>

      {/* Team Statistics */}
      {stats && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Team Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{stats.totalAthletes}</div>
              <div style={{ color: '#333', marginTop: '0.5rem' }}>Total Athletes</div>
            </div>
            {stats.avgRanking && (
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>#{stats.avgRanking}</div>
                <div style={{ color: '#333', marginTop: '0.5rem' }}>Avg Ranking</div>
              </div>
            )}
            {stats.best5K && (
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{stats.best5K}</div>
                <div style={{ color: '#333', marginTop: '0.5rem' }}>Best 5K PR</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem' }}>Roster ({team.roster?.length || 0} Athletes)</h2>
        {team.roster && team.roster.length > 0 ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {team.roster.map(athlete => (
              <div key={athlete.id} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                background: 'linear-gradient(to right, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                {/* Athlete Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{athlete.name}</h3>
                      {athlete.ranking && (
                        <span style={{
                          ...getRankBadgeStyle(athlete.ranking),
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          fontWeight: 'bold'
                        }}>
                          #{athlete.ranking}
                        </span>
                      )}
                      {athlete.grade && (
                        <span style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          fontWeight: 'bold'
                        }}>
                          {athlete.grade}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#333', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                      <strong>{athlete.school}</strong> • {athlete.gender === 'M' ? 'Men' : 'Women'}
                    </div>
                    <div style={{ color: '#555', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Pick #{athlete.overall_pick} (Round {athlete.round}, Pick {athlete.pick_number})
                    </div>
                  </div>
                </div>

                {/* All Performances by Distance */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                  {/* Render all distances that have results */}
                  {['5K', '6K', '8K', '10K'].map(distance => {
                    const performances = athlete.allResults?.[distance] || [];
                    if (performances.length === 0) return null;

                    const distanceColors = {
                      '5K': '#2c3e50',
                      '6K': '#34495e',
                      '8K': '#2c3e50',
                      '10K': '#34495e'
                    };

                    return (
                      <div key={distance} style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#555', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          {distance} Performances ({performances.length})
                        </div>

                        {/* Show all performances */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {performances.map((perf, idx) => (
                            <div key={idx} style={{
                              padding: '0.75rem',
                              background: idx === 0 ? `${distanceColors[distance]}15` : '#f8f9fa',
                              borderRadius: '6px',
                              border: idx === 0 ? `2px solid ${distanceColors[distance]}` : '1px solid #e0e0e0'
                            }}>
                              {/* Time - highlight PR */}
                              <div style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: idx === 0 ? distanceColors[distance] : '#333',
                                marginBottom: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                {perf.time}
                                {idx === 0 && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    padding: '0.15rem 0.4rem',
                                    background: distanceColors[distance],
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                  }}>
                                    PR
                                  </span>
                                )}
                              </div>

                              {/* Meet info */}
                              <div style={{ fontSize: '0.75rem', color: '#333' }}>
                                <div style={{ fontWeight: '500', marginBottom: '0.15rem' }}>{perf.meet_name}</div>
                                <div style={{ color: '#555', fontSize: '0.7rem' }}>
                                  {perf.meet_date}
                                  {perf.place && ` • Place: ${perf.place}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* No Results Message */}
                {(!athlete.allResults || Object.values(athlete.allResults).every(arr => arr.length === 0)) && (
                  <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', color: '#555', textAlign: 'center', marginTop: '1.5rem' }}>
                    No race results available
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ fontSize: '1.1rem' }}>No athletes drafted yet</p>
            {team.draft_id && (
              <Link to={`/draft/${team.draft_id}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Go to Draft
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamView;
