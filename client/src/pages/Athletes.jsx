import { useState, useEffect } from 'react';

function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAthlete, setNewAthlete] = useState({
    name: '',
    school: '',
    grade: '',
    gender: 'M',
    pr_5k: '',
    ranking: ''
  });

  useEffect(() => {
    loadAthletes();
  }, [genderFilter]);

  const loadAthletes = async () => {
    try {
      const params = new URLSearchParams();
      if (genderFilter) params.append('gender', genderFilter);

      const res = await fetch(`/api/athletes?${params}`);
      const data = await res.json();
      setAthletes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading athletes:', error);
      setLoading(false);
    }
  };

  const addAthlete = async (e) => {
    e.preventDefault();

    // Convert time to seconds (MM:SS format)
    const [minutes, seconds] = newAthlete.pr_5k.split(':').map(Number);
    const pr_5k_seconds = minutes * 60 + seconds;

    try {
      await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAthlete,
          pr_5k_seconds,
          grade: parseInt(newAthlete.grade),
          ranking: parseInt(newAthlete.ranking)
        })
      });

      setShowAddForm(false);
      setNewAthlete({
        name: '',
        school: '',
        grade: '',
        gender: 'M',
        pr_5k: '',
        ranking: ''
      });
      loadAthletes();
    } catch (error) {
      console.error('Error adding athlete:', error);
      alert('Failed to add athlete');
    }
  };

  const deleteAthletesWithoutGrades = async () => {
    if (!confirm(
      'Delete all athletes WITHOUT grades?\n\n' +
      'This will remove:\n' +
      '- High school athletes (no grade info)\n' +
      '- Any athletes missing grade data\n\n' +
      'College athletes with FR/SO/JR/SR grades will be kept.\n\n' +
      'This cannot be undone!'
    )) {
      return;
    }

    try {
      const res = await fetch('/api/athletes/delete-no-grade', {
        method: 'POST'
      });

      const data = await res.json();

      let message = data.message;
      if (data.sampleDeleted && data.sampleDeleted.length > 0) {
        message += '\n\nSample deleted athletes:\n';
        data.sampleDeleted.slice(0, 10).forEach(name => {
          message += `${name}\n`;
        });
        if (data.count > 10) {
          message += `... and ${data.count - 10} more`;
        }
      }

      alert(message);
      loadAthletes(); // Reload to show updated list
    } catch (error) {
      console.error('Error deleting athletes:', error);
      alert('Failed to delete athletes');
    }
  };

  const migrateGrades = async () => {
    if (!confirm(
      'Migrate athlete grades to current season (2025-26)?\n\n' +
      'This will advance grades by one year for athletes whose most recent race was in 2024 or earlier:\n' +
      '- FR → SO\n' +
      '- SO → JR\n' +
      '- JR → SR\n' +
      '- SR → SR (stays senior)\n\n' +
      'Athletes with 2025 meets will NOT be affected.'
    )) {
      return;
    }

    try {
      const res = await fetch('/api/athletes/migrate-grades', {
        method: 'POST'
      });

      const data = await res.json();

      let message = data.message;
      if (data.sampleUpdates && data.sampleUpdates.length > 0) {
        message += '\n\nSample updates:\n';
        data.sampleUpdates.slice(0, 10).forEach(u => {
          message += `${u.name} (${u.school}): ${u.oldGrade} → ${u.newGrade}\n`;
        });
        if (data.athletesUpdated > 10) {
          message += `... and ${data.athletesUpdated - 10} more`;
        }
      }

      alert(message);
      loadAthletes(); // Reload to show updated grades
    } catch (error) {
      console.error('Error migrating grades:', error);
      alert('Failed to migrate grades');
    }
  };

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading athletes...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex-between">
            <h1 className="card-title">Athletes Database</h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                onClick={deleteAthletesWithoutGrades}
                title="Delete all athletes without grade information (high schoolers)"
              >
                Delete Athletes w/o Grades
              </button>
              <button
                className="btn btn-secondary"
                onClick={migrateGrades}
                title="Update grades for current season"
                style={{ background: '#fd7e14', color: 'white' }}
              >
                Migrate Grades to 2025-26
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Cancel' : '+ Add Athlete'}
              </button>
            </div>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={addAthlete} className="card mb-3">
            <h2>Add New Athlete</h2>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAthlete.name}
                  onChange={e => setNewAthlete({...newAthlete, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">School</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAthlete.school}
                  onChange={e => setNewAthlete({...newAthlete, school: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <input
                  type="number"
                  className="form-input"
                  value={newAthlete.grade}
                  onChange={e => setNewAthlete({...newAthlete, grade: e.target.value})}
                  min="9"
                  max="12"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={newAthlete.gender}
                  onChange={e => setNewAthlete({...newAthlete, gender: e.target.value})}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">5K PR (MM:SS)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAthlete.pr_5k}
                  onChange={e => setNewAthlete({...newAthlete, pr_5k: e.target.value})}
                  placeholder="14:30"
                  pattern="\d{1,2}:\d{2}"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ranking</label>
                <input
                  type="number"
                  className="form-input"
                  value={newAthlete.ranking}
                  onChange={e => setNewAthlete({...newAthlete, ranking: e.target.value})}
                  min="1"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Add Athlete</button>
          </form>
        )}

        <div className="grid grid-2 mb-3">
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group">
            <select
              className="form-select"
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="M">Men</option>
              <option value="F">Women</option>
            </select>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>School</th>
              <th>Grade</th>
              <th>Gender</th>
              <th>5K PR</th>
            </tr>
          </thead>
          <tbody>
            {filteredAthletes.map(athlete => (
              <tr key={athlete.id}>
                <td>#{athlete.ranking}</td>
                <td><strong>{athlete.name}</strong></td>
                <td>{athlete.school}</td>
                <td>{athlete.grade}</td>
                <td>{athlete.gender}</td>
                <td>{athlete.pr_5k}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAthletes.length === 0 && (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            No athletes found
          </div>
        )}
      </div>
    </div>
  );
}

export default Athletes;
