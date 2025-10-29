import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSounds } from '../hooks/useSounds';

function Home() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playClick, playDelete, playSuccess, playRefresh, toggleSounds } = useSounds();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      playRefresh();
      const res = await fetch('/api/draft');
      const data = await res.json();
      setDrafts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading drafts:', error);
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId, draftName) => {
    if (!confirm(`Delete "${draftName}"?\n\nThis will permanently delete the draft, all teams, and all picks.`)) {
      return;
    }

    try {
      playDelete();
      const res = await fetch(`/api/draft/${draftId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        playSuccess();
        loadDrafts();
      } else {
        const error = await res.json();
        alert(`Failed to delete draft: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">NCAA XC FANTASY DRAFT</h1>
          <p style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.6', color: '#333' }}>
            Draft your dream team for the National Championships!
          </p>
        </div>

        <div className="flex-between mb-3">
          <h2>Your Drafts</h2>
          <Link to="/draft/setup" className="btn btn-success" onClick={playClick}>
            New Draft
          </Link>
        </div>

        {loading ? (
          <div className="loading">Loading drafts</div>
        ) : drafts.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏁</div>
            <h3 className="text-muted">No Drafts Yet</h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#333', margin: '1rem 0' }}>
              Create your first draft to get started!
            </p>
            <Link to="/draft/setup" className="btn btn-success" onClick={playClick}>
              Create Draft
            </Link>
          </div>
        ) : (
          <div className="grid grid-2">
            {drafts.map(draft => (
              <div key={draft.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', gap: '0.5rem' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    flex: 1,
                    lineHeight: 1.4
                  }}>
                    {draft.gender === 'M' ? 'M' : draft.gender === 'F' ? 'W' : ''} {draft.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteDraft(draft.id, draft.name);
                    }}
                    className="btn btn-danger"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.9rem',
                      minWidth: 'auto',
                      flexShrink: 0
                    }}
                    title="Delete draft"
                  >
                    X
                  </button>
                </div>

                <div style={{ fontSize: '1rem', lineHeight: '2', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Status:</span>
                    <span className={
                      draft.status === 'completed' ? 'badge badge-success' :
                      draft.status === 'in_progress' ? 'badge badge-warning' :
                      'badge badge-info'
                    }>
                      {draft.status === 'in_progress' ? 'LIVE' : draft.status === 'completed' ? 'DONE' : 'READY'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Round:</span>
                    <span>{draft.current_round}/{draft.total_rounds}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Teams:</span>
                    <span>{draft.team_count}</span>
                  </div>
                </div>

                <Link
                  to={`/draft/${draft.id}`}
                  className="btn btn-primary mt-2"
                  style={{ width: '100%' }}
                  onClick={playClick}
                >
                  {draft.status === 'setup' ? 'Setup' : draft.status === 'in_progress' ? 'Continue' : 'View'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-2 mt-3">
        <div className="card">
          <h2>Quick Links</h2>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <Link to="/athletes" className="btn btn-secondary" onClick={playClick}>Browse Athletes</Link>
            <Link to="/meets" className="btn btn-secondary" onClick={playClick}>View Meets & Results</Link>
          </div>
        </div>

        <div className="card">
          <h2>How It Works</h2>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Create a draft and invite friends</li>
            <li>Take turns picking cross country runners</li>
            <li>Track results from real meets</li>
            <li>Compete for the lowest team score (cross country scoring)</li>
          </ol>
        </div>
      </div>

      <div className="card mt-3">
        <h2>Settings</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <strong>🔊 Sound Effects</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>
              8-bit retro sounds for buttons and typing
            </p>
          </div>
          <button
            onClick={() => {
              const newState = toggleSounds();
              setSoundEnabled(newState);
            }}
            className={`btn ${soundEnabled ? 'btn-success' : 'btn-secondary'}`}
            style={{ minWidth: '100px' }}
          >
            {soundEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
