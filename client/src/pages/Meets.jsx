import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Meets() {
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeet, setNewMeet] = useState({
    name: '',
    date: '',
    location: '',
    distance: '5K'
  });

  useEffect(() => {
    loadMeets();
  }, []);

  const loadMeets = async () => {
    try {
      const res = await fetch('/api/meets');
      const data = await res.json();
      setMeets(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading meets:', error);
      setLoading(false);
    }
  };

  const addMeet = async (e) => {
    e.preventDefault();

    try {
      await fetch('/api/meets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeet)
      });

      setShowAddForm(false);
      setNewMeet({
        name: '',
        date: '',
        location: '',
        distance: '5K'
      });
      loadMeets();
    } catch (error) {
      console.error('Error adding meet:', error);
      alert('Failed to add meet');
    }
  };

  const deleteMeet = async (id, name) => {
    if (!confirm(`Delete "${name}"?\n\nThis will also remove:\n- All results for this meet\n- Any athletes only associated with this meet`)) {
      return;
    }

    try {
      const res = await fetch(`/api/meets/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      let message = `Deleted ${name}`;
      if (data.orphanedAthletesRemoved > 0) {
        message += `\n\nAlso removed ${data.orphanedAthletesRemoved} athlete(s) that were only associated with this meet.`;
      }

      alert(message);
      loadMeets();
    } catch (error) {
      console.error('Error deleting meet:', error);
      alert('Failed to delete meet');
    }
  };

  const deleteAllMeets = async () => {
    if (!confirm(
      `Delete ALL ${meets.length} meets?\n\n` +
      `This will also remove:\n` +
      `- All results for all meets\n` +
      `- Any athletes only associated with these meets\n\n` +
      `This cannot be undone!`
    )) {
      return;
    }

    if (!confirm(`Are you ABSOLUTELY sure? This will delete ${meets.length} meets!`)) {
      return;
    }

    try {
      const res = await fetch('/api/meets', {
        method: 'DELETE'
      });

      const data = await res.json();

      let message = data.message;
      if (data.orphanedAthletesRemoved > 0) {
        message += `\n\nAlso removed ${data.orphanedAthletesRemoved} athlete(s) that were only associated with these meets.`;
      }

      alert(message);
      loadMeets();
    } catch (error) {
      console.error('Error deleting meets:', error);
      alert('Failed to delete meets');
    }
  };

  const cleanupOrphanedResults = async () => {
    if (!confirm(
      'Clean up orphaned results?\n\n' +
      'This will remove results from deleted meets.\n' +
      'Run this BEFORE cleaning up athletes.'
    )) {
      return;
    }

    try {
      const res = await fetch('/api/meets/cleanup-results', {
        method: 'POST'
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}\n\nCheck server console for details.`);
        return;
      }

      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error('Error cleaning up results:', error);
      alert(`Failed to clean up results: ${error.message}`);
    }
  };

  const cleanupOrphanedAthletes = async () => {
    if (!confirm(
      'Clean up orphaned athletes?\n\n' +
      'This will remove any athletes that:\n' +
      '- Have no results in any meet\n' +
      '- Have not been drafted\n\n' +
      'TIP: Run "Clean Up Results" first if you deleted meets.\n\n' +
      'Check the server console for detailed info.'
    )) {
      return;
    }

    try {
      const res = await fetch('/api/meets/cleanup-athletes', {
        method: 'POST'
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}\n\nCheck server console for details.`);
        return;
      }

      const data = await res.json();

      let message = data.message;
      if (data.athletesDeleted && data.athletesDeleted.length > 0) {
        message += `\n\nDeleted athletes:\n${data.athletesDeleted.join('\n')}`;
        if (data.count > data.athletesDeleted.length) {
          message += `\n... and ${data.count - data.athletesDeleted.length} more`;
        }
      }

      alert(message);
    } catch (error) {
      console.error('Error cleaning up athletes:', error);
      alert(`Failed to clean up athletes: ${error.message}\n\nCheck browser console and server logs for details.`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading meets...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex-between">
            <h1 className="card-title">Cross Country Meets</h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={cleanupOrphanedResults}
                title="Remove results from deleted meets (do this first!)"
                style={{ background: '#fd7e14', color: 'white' }}
              >
                1. Clean Up Results
              </button>
              <button
                className="btn btn-secondary"
                onClick={cleanupOrphanedAthletes}
                title="Remove athletes with no results and not drafted (do this second)"
              >
                2. Clean Up Athletes
              </button>
              <button
                className="btn btn-danger"
                onClick={deleteAllMeets}
                disabled={meets.length === 0}
              >
                Delete All Meets
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Cancel' : '+ Add Meet'}
              </button>
            </div>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={addMeet} className="card mb-3">
            <h2>Add New Meet</h2>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Meet Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMeet.name}
                  onChange={e => setNewMeet({...newMeet, name: e.target.value})}
                  placeholder="e.g., State Championship"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newMeet.date}
                  onChange={e => setNewMeet({...newMeet, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMeet.location}
                  onChange={e => setNewMeet({...newMeet, location: e.target.value})}
                  placeholder="e.g., City Park"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Distance</label>
                <select
                  className="form-select"
                  value={newMeet.distance}
                  onChange={e => setNewMeet({...newMeet, distance: e.target.value})}
                >
                  <option value="5K">5K</option>
                  <option value="8K">8K</option>
                  <option value="10K">10K</option>
                  <option value="6K">6K</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-success">Add Meet</button>
          </form>
        )}

        {meets.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '3rem' }}>
            <h3>No meets scheduled</h3>
            <p>Add your first meet to start tracking results!</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {meets.map(meet => (
              <div key={meet.id} className="card">
                <h3>{meet.name}</h3>
                <p className="text-muted">
                  <strong>Date:</strong> {formatDate(meet.date)}
                </p>
                {meet.location && (
                  <p className="text-muted">
                    <strong>Location:</strong> {meet.location}
                  </p>
                )}
                <p className="text-muted">
                  <strong>Distance:</strong> {meet.distance}
                </p>
                <p>
                  <span className={`badge badge-${
                    meet.status === 'completed' ? 'success' :
                    meet.status === 'in_progress' ? 'warning' : 'info'
                  }`}>
                    {meet.status}
                  </span>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Link to={`/meets/${meet.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                    View Details
                  </Link>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteMeet(meet.id, meet.name)}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Meets;
