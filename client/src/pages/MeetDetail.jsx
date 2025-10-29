import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function MeetDetail() {
  const { id } = useParams();
  const [meet, setMeet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('men');

  useEffect(() => {
    loadMeet();
  }, [id]);

  const loadMeet = async () => {
    try {
      const res = await fetch(`/api/meets/${id}`);
      const data = await res.json();
      console.log('Meet data loaded:', data);
      setMeet(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading meet:', error);
      setLoading(false);
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
    return <div className="loading">Loading meet...</div>;
  }

  if (!meet) {
    return <div className="container"><div className="card">Meet not found</div></div>;
  }

  // Separate results by gender
  const menResults = meet.results ? meet.results.filter(r => r.gender === 'M') : [];
  const womenResults = meet.results ? meet.results.filter(r => r.gender === 'F') : [];
  const currentResults = activeTab === 'men' ? menResults : womenResults;

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex-between">
            <div>
              <h1 className="card-title">{meet.name}</h1>
              <p className="text-muted">
                {formatDate(meet.date)} | {meet.location} | {meet.distance}
              </p>
              <p>
                <span className={`badge badge-${
                  meet.status === 'completed' ? 'success' :
                  meet.status === 'in_progress' ? 'warning' : 'info'
                }`}>
                  {meet.status}
                </span>
              </p>
            </div>
            <Link to="/meets" className="btn btn-secondary">Back to Meets</Link>
          </div>
        </div>

        {/* Gender Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setActiveTab('men')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'men' ? 'var(--forest-green)' : 'transparent',
              color: activeTab === 'men' ? 'white' : '#666',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderBottom: activeTab === 'men' ? '3px solid var(--burnt-orange)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Men ({menResults.length})
          </button>
          <button
            onClick={() => setActiveTab('women')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'women' ? 'var(--forest-green)' : 'transparent',
              color: activeTab === 'women' ? 'white' : '#666',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderBottom: activeTab === 'women' ? '3px solid var(--burnt-orange)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Women ({womenResults.length})
          </button>
        </div>

        {/* Results Table */}
        {currentResults.length > 0 ? (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Individual Results</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Name</th>
                  <th>Year</th>
                  <th>Team</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {currentResults.map(result => (
                  <tr key={result.id}>
                    <td><strong>{result.place}</strong></td>
                    <td><strong>{result.name}</strong></td>
                    <td>{result.grade || '-'}</td>
                    <td>{result.school}</td>
                    <td>{result.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            No {activeTab === 'men' ? "men's" : "women's"} results for this meet.
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetDetail;
