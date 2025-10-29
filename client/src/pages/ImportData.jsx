import { useState, useEffect } from 'react';

function ImportData() {
  const [predefinedMeets, setPredefinedMeets] = useState([]);
  const [customMeetUrl, setCustomMeetUrl] = useState('');
  const [customMeetName, setCustomMeetName] = useState('');
  const [customMeetDate, setCustomMeetDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPredefinedMeets();
  }, []);

  const loadPredefinedMeets = async () => {
    try {
      const res = await fetch('/api/import/meets/2024');
      const data = await res.json();
      setPredefinedMeets(data);
    } catch (err) {
      console.error('Error loading predefined meets:', err);
    }
  };

  const importPredefinedMeet = async (meetKey, meetName) => {
    if (!confirm(`Import all results from ${meetName}? This may take a few minutes.`)) {
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/import/bulk/2024/${meetKey}`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error importing meet:', err);
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const importCustomMeet = async (e) => {
    e.preventDefault();

    if (!customMeetUrl) {
      setError('Please enter a TFRRS meet URL');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/import/meet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetUrl: customMeetUrl,
          meetName: customMeetName || 'Imported Meet',
          meetDate: customMeetDate || new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        setCustomMeetUrl('');
        setCustomMeetName('');
        setCustomMeetDate('');
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error importing meet:', err);
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Import NCAA D1 Cross Country Data</h1>
          <p className="text-muted">
            Import athlete and meet data from TFRRS (Track & Field Results Reporting System)
          </p>
        </div>

        {importing && (
          <div className="card" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
            <h3>⏳ Importing data...</h3>
            <p>This may take a minute. Please wait...</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ background: '#f8d7da', border: '1px solid #dc3545' }}>
            <h3>❌ Error</h3>
            <p>{error}</p>
            <button className="btn btn-secondary mt-2" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="card" style={{ background: '#d4edda', border: '1px solid #28a745' }}>
            <h3>✅ Import Successful!</h3>
            <p><strong>Meet:</strong> {result.meetName}</p>
            <p><strong>New Athletes:</strong> {result.athletesImported}</p>
            <p><strong>Results Imported:</strong> {result.resultsImported} / {result.totalResults}</p>
            <button className="btn btn-primary mt-2" onClick={() => setResult(null)}>
              Import Another Meet
            </button>
          </div>
        )}

        <div className="card">
          <h2>2024 NCAA D1 Championships & Regionals</h2>
          <p className="text-muted mb-3">
            Quick import from major 2024 NCAA Division I cross country meets
          </p>

          {predefinedMeets.length === 0 ? (
            <p className="text-muted">Loading meets...</p>
          ) : (
            <div className="grid grid-2">
              {predefinedMeets.map(meet => (
                <div key={meet.id} className="card">
                  <h3>{meet.name}</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {meet.url}
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => importPredefinedMeet(meet.id, meet.name)}
                    disabled={importing}
                    style={{ width: '100%' }}
                  >
                    {importing ? 'Importing...' : 'Import Results'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Import Custom Meet</h2>
          <p className="text-muted mb-3">
            Import any NCAA D1 cross country meet from TFRRS
          </p>

          <form onSubmit={importCustomMeet}>
            <div className="form-group">
              <label className="form-label">TFRRS Meet URL</label>
              <input
                type="url"
                className="form-input"
                value={customMeetUrl}
                onChange={e => setCustomMeetUrl(e.target.value)}
                placeholder="https://tfrrs.org/results/xc/25334/NCAA_DI_Championships"
                disabled={importing}
              />
              <small className="text-muted">
                Find meet URLs at <a href="https://xc.tfrrs.org/" target="_blank" rel="noopener noreferrer">xc.tfrrs.org</a>
              </small>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Meet Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={customMeetName}
                  onChange={e => setCustomMeetName(e.target.value)}
                  placeholder="e.g., Conference Championships"
                  disabled={importing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Meet Date (optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={customMeetDate}
                  onChange={e => setCustomMeetDate(e.target.value)}
                  disabled={importing}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={importing || !customMeetUrl}
            >
              {importing ? 'Importing...' : 'Import Meet'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>How It Works</h2>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Select a predefined 2024 meet or enter a custom TFRRS meet URL</li>
            <li>The system will scrape all results from TFRRS</li>
            <li>Athletes are automatically added to your database</li>
            <li>Meet results are imported with times and places</li>
            <li>Athlete PRs are updated if they ran faster times</li>
            <li>All imported athletes become available for drafting!</li>
          </ol>

          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
            <strong>Note:</strong> TFRRS may block automated requests if you import too frequently.
            If imports fail, wait a few minutes and try again.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportData;
