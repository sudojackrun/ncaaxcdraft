import { useState, useEffect } from 'react';

function AthletesImproved() {
  const [athletes, setAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('M'); // Default to Men
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    loadAthletes();
  }, [genderFilter]);

  const loadAthletes = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (genderFilter) params.append('gender', genderFilter);

      const res = await fetch(`/api/athletes?${params}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setAthletes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading athletes:', error);
      setError(error.message);
      setAthletes([]);
      setLoading(false);
    }
  };

  const deleteAthlete = async (id, name) => {
    if (!confirm(`Delete ${name}? This will also remove their results and draft history.`)) {
      return;
    }

    try {
      await fetch(`/api/athletes/${id}`, {
        method: 'DELETE'
      });

      alert(`Deleted ${name}`);
      loadAthletes();
    } catch (error) {
      console.error('Error deleting athlete:', error);
      alert('Failed to delete athlete');
    }
  };

  const deleteAllAthletes = async () => {
    const genderText = genderFilter ? (genderFilter === 'M' ? 'male' : 'female') : 'all';
    if (!confirm(
      `Delete ALL ${filteredAthletes.length} ${genderText} athletes?\n\n` +
      `This will also remove all their results and draft history. This cannot be undone!`
    )) {
      return;
    }

    if (!confirm(`Are you ABSOLUTELY sure? This will delete ${filteredAthletes.length} athletes!`)) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (genderFilter) params.append('gender', genderFilter);

      const res = await fetch(`/api/athletes?${params}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      alert(data.message);
      loadAthletes();
    } catch (error) {
      console.error('Error deleting athletes:', error);
      alert('Failed to delete athletes');
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortValue = (athlete, column) => {
    // Handle special cases for sorting
    if (column === 'pr_5k_seconds') return athlete.pr_5k_seconds || Infinity;
    if (column === 'pr_6k_seconds') return athlete.pr_6k_seconds || Infinity;
    if (column === 'pr_8k_seconds') return athlete.pr_8k_seconds || Infinity;
    if (column === 'pr_10k_seconds') return athlete.pr_10k_seconds || Infinity;
    return athlete[column] || '';
  };

  const filteredAthletes = athletes
    .filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.school.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return bStr < aStr ? -1 : bStr > aStr ? 1 : 0;
      }
    });

  const SortableHeader = ({ column, label }) => {
    const isActive = sortColumn === column;
    const arrow = isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⬍';

    return (
      <th
        onClick={() => handleSort(column)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isActive ? '#e3f2fd' : 'transparent',
          fontWeight: isActive ? 'bold' : 'normal',
          transition: 'background-color 0.2s'
        }}
        title={`Sort by ${label}`}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = isActive ? '#bbdefb' : '#f5f5f5'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = isActive ? '#e3f2fd' : 'transparent'}
      >
        {label}
        <span style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: isActive ? 1 : 0.5 }}>
          {arrow}
        </span>
      </th>
    );
  };

  const getBestPR = (athlete) => {
    const prs = [];
    if (athlete.pr_5k) prs.push({ distance: '5K', time: athlete.pr_5k });
    if (athlete.pr_6k) prs.push({ distance: '6K', time: athlete.pr_6k });
    if (athlete.pr_8k) prs.push({ distance: '8K', time: athlete.pr_8k });
    if (athlete.pr_10k) prs.push({ distance: '10K', time: athlete.pr_10k });
    return prs.length > 0 ? prs : [{ distance: 'N/A', time: '--' }];
  };

  if (loading) {
    return <div className="loading">Loading athletes...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2 style={{ color: 'red' }}>Error Loading Athletes</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAthletes}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Athletes Database</h1>
          <p className="text-muted">
            {filteredAthletes.length} {genderFilter === 'M' ? 'male' : genderFilter === 'F' ? 'female' : ''} athletes
          </p>
        </div>

        {/* Gender Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--forest-green)', padding: '0.5rem', borderRadius: '8px' }}>
          <button
            className={`btn ${genderFilter === 'M' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGenderFilter('M')}
            style={{
              flex: 1,
              background: genderFilter === 'M' ? 'var(--orange)' : 'var(--pixel-gray)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            Men
          </button>
          <button
            className={`btn ${genderFilter === 'F' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGenderFilter('F')}
            style={{
              flex: 1,
              background: genderFilter === 'F' ? 'var(--orange)' : 'var(--pixel-gray)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            Women
          </button>
          <button
            className={`btn ${genderFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGenderFilter('')}
            style={{
              flex: 1,
              background: genderFilter === '' ? 'var(--orange)' : 'var(--pixel-gray)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            All
          </button>
        </div>

        {/* Actions */}
        <div className="flex-between mb-3">
          <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn-danger"
            onClick={deleteAllAthletes}
            disabled={filteredAthletes.length === 0}
          >
            Delete All {genderFilter ? (genderFilter === 'M' ? 'Men' : 'Women') : 'Athletes'}
          </button>
        </div>

        {/* Athletes Table */}
        {filteredAthletes.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '3rem' }}>
            <h3>No athletes found</h3>
            <p>Import athletes from TFRRS or add them manually</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <SortableHeader column="name" label="Name" />
                  <SortableHeader column="school" label="School" />
                  <SortableHeader column="grade" label="Grade" />
                  <SortableHeader column="gender" label="Gender" />
                  <SortableHeader column="pr_5k_seconds" label="5K PR" />
                  <SortableHeader column="pr_6k_seconds" label="6K PR" />
                  <SortableHeader column="pr_8k_seconds" label="8K PR" />
                  <SortableHeader column="pr_10k_seconds" label="10K PR" />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.map(athlete => (
                  <tr key={athlete.id}>
                    <td>
                      <strong>{athlete.name}</strong>
                      {athlete.tfrrs_url && (
                        <a
                          href={athlete.tfrrs_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}
                        >
                          TFRRS ↗
                        </a>
                      )}
                    </td>
                    <td>{athlete.school}</td>
                    <td>{athlete.grade || '--'}</td>
                    <td>{athlete.gender}</td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{athlete.pr_5k || '--'}</div>
                      {athlete.pr_5k_meet_name && (
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {athlete.pr_5k_meet_name}
                          {athlete.pr_5k_meet_date && ` • ${athlete.pr_5k_meet_date}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{athlete.pr_6k || '--'}</div>
                      {athlete.pr_6k_meet_name && (
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {athlete.pr_6k_meet_name}
                          {athlete.pr_6k_meet_date && ` • ${athlete.pr_6k_meet_date}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{athlete.pr_8k || '--'}</div>
                      {athlete.pr_8k_meet_name && (
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {athlete.pr_8k_meet_name}
                          {athlete.pr_8k_meet_date && ` • ${athlete.pr_8k_meet_date}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{athlete.pr_10k || '--'}</div>
                      {athlete.pr_10k_meet_name && (
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {athlete.pr_10k_meet_name}
                          {athlete.pr_10k_meet_date && ` • ${athlete.pr_10k_meet_date}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteAthlete(athlete.id, athlete.name)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Summary */}
        <div className="card" style={{ marginTop: '1rem', background: '#f8f9fa' }}>
          <h3>Database Stats</h3>
          <div className="grid grid-3">
            <div>
              <p className="text-muted">Total Athletes</p>
              <h2>{filteredAthletes.length}</h2>
            </div>
            <div>
              <p className="text-muted">With 5K PR</p>
              <h2>{filteredAthletes.filter(a => a.pr_5k).length}</h2>
            </div>
            <div>
              <p className="text-muted">With 6K PR</p>
              <h2>{filteredAthletes.filter(a => a.pr_6k).length}</h2>
            </div>
            <div>
              <p className="text-muted">With 8K PR</p>
              <h2>{filteredAthletes.filter(a => a.pr_8k).length}</h2>
            </div>
            <div>
              <p className="text-muted">With 10K PR</p>
              <h2>{filteredAthletes.filter(a => a.pr_10k).length}</h2>
            </div>
            <div>
              <p className="text-muted">Schools Represented</p>
              <h2>{new Set(filteredAthletes.map(a => a.school)).size}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AthletesImproved;
