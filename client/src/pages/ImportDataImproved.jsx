import { useState, useEffect } from 'react';

function ImportDataImproved() {
  const [currentSeasonMeets, setCurrentSeasonMeets] = useState([]);
  const [customMeetUrl, setCustomMeetUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [autoImporting, setAutoImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [autoImportResults, setAutoImportResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMeets, setSelectedMeets] = useState([]);

  useEffect(() => {
    loadCurrentSeasonMeets();
  }, []);

  const loadCurrentSeasonMeets = async () => {
    try {
      const res = await fetch('/api/import/meets/current-season');
      const data = await res.json();
      setCurrentSeasonMeets(data);
    } catch (err) {
      console.error('Error loading meets:', err);
    }
  };

  const validateUrl = (url) => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('tfrrs.org')) {
        return 'URL must be from tfrrs.org';
      }
      if (!urlObj.pathname.includes('/results/xc/')) {
        return 'URL must be a cross country results page (should contain /results/xc/)';
      }
      return null;
    } catch {
      return 'Invalid URL format';
    }
  };

  const importSingleMeet = async (meetKey, meetName) => {
    if (!confirm(`Import all results from ${meetName}? This may take 1-2 minutes.`)) {
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/import/bulk/current-season/${meetKey}`, {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Import failed');
        if (data.details) {
          setError(data.error + '\n\n' + data.details);
        }
      }
    } catch (err) {
      console.error('Error importing meet:', err);
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const autoImportAll = async () => {
    if (!confirm(
      `Import ALL ${selectedMeets.length > 0 ? selectedMeets.length : currentSeasonMeets.length} selected meets?\n\n` +
      `This will take ${(selectedMeets.length || currentSeasonMeets.length) * 2} - ${(selectedMeets.length || currentSeasonMeets.length) * 3} minutes.\n\n` +
      `IMPORTANT: TFRRS may block requests if you import too many meets. Use this feature sparingly!`
    )) {
      return;
    }

    setAutoImporting(true);
    setError(null);
    setAutoImportResults(null);

    try {
      const res = await fetch('/api/import/auto-import/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetIds: selectedMeets.length > 0 ? selectedMeets : undefined
        })
      });

      const data = await res.json();
      setAutoImportResults(data);

      if (data.rateLimited) {
        setError('Import stopped due to rate limiting. Wait 10-15 minutes before trying again.');
      }
    } catch (err) {
      console.error('Error auto-importing:', err);
      setError(err.message || 'Auto-import failed');
    } finally {
      setAutoImporting(false);
    }
  };

  const toggleMeetSelection = (meetId) => {
    setSelectedMeets(prev =>
      prev.includes(meetId)
        ? prev.filter(id => id !== meetId)
        : [...prev, meetId]
    );
  };

  const importCustomMeet = async (e) => {
    e.preventDefault();

    const urlError = validateUrl(customMeetUrl);
    if (urlError) {
      setError(urlError);
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
          meetUrl: customMeetUrl
          // Meet name and date are automatically extracted from the page!
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
        setCustomMeetUrl('');
      } else {
        setError(data.error || 'Import failed');
        if (data.hint) {
          setError(data.error + '\n\n💡 ' + data.hint);
        }
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
            <p>This may take 1-2 minutes. Please wait...</p>
          </div>
        )}

        {autoImporting && (
          <div className="card" style={{ background: '#d1ecf1', border: '1px solid #0c5460' }}>
            <h3>🔄 Auto-importing multiple meets...</h3>
            <p>This will take several minutes. The page may seem unresponsive - this is normal.</p>
            <p><strong>Please do not close this page!</strong></p>
          </div>
        )}

        {error && (
          <div className="card" style={{ background: '#f8d7da', border: '1px solid #dc3545' }}>
            <h3>❌ Error</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            {error.includes('blocking') && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '6px' }}>
                <strong>What to do:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  <li>Wait 5-10 minutes before trying again</li>
                  <li>TFRRS limits automated requests to prevent server overload</li>
                  <li>Import one meet at a time instead of using auto-import</li>
                  <li>Try again during off-peak hours</li>
                </ul>
              </div>
            )}
            <button className="btn btn-secondary mt-2" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="card" style={{ background: '#d4edda', border: '1px solid #28a745' }}>
            <h3>✅ Import Successful!</h3>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', marginBottom: '1rem' }}>
              <p><strong>Meet:</strong> {result.meetName || 'Imported Meet'}</p>
              {result.meetDate && <p><strong>Date:</strong> {result.meetDate}</p>}
            </div>
            <p><strong>New Athletes:</strong> {result.athletesImported}</p>
            {result.athletesUpdated > 0 && (
              <p><strong>Athletes Updated (PRs):</strong> {result.athletesUpdated}</p>
            )}
            <p><strong>Results Imported:</strong> {result.resultsImported} / {result.totalResults}</p>
            <button className="btn btn-primary mt-2" onClick={() => setResult(null)}>
              Import Another Meet
            </button>
          </div>
        )}

        {autoImportResults && (
          <div className="card" style={{ background: '#d4edda', border: '1px solid #28a745' }}>
            <h3>✅ Auto-Import Complete!</h3>
            <p><strong>Successfully Imported:</strong> {autoImportResults.success.length} meets</p>
            <p><strong>Failed:</strong> {autoImportResults.failed.length} meets</p>
            <p><strong>Total Athletes:</strong> {autoImportResults.totalAthletes}</p>
            <p><strong>Total Results:</strong> {autoImportResults.totalResults}</p>

            {autoImportResults.success.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Imported Meets:</strong>
                <ul style={{ marginTop: '0.5rem' }}>
                  {autoImportResults.success.map((m, i) => (
                    <li key={i}>{m.meet} - {m.athletesImported} athletes, {m.resultsImported} results</li>
                  ))}
                </ul>
              </div>
            )}

            {autoImportResults.failed.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Failed Meets:</strong>
                <ul style={{ marginTop: '0.5rem' }}>
                  {autoImportResults.failed.map((m, i) => (
                    <li key={i}>{m.meet} - {m.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button className="btn btn-primary mt-2" onClick={() => setAutoImportResults(null)}>
              Done
            </button>
          </div>
        )}

        <div className="card">
          <div className="flex-between mb-3">
            <h2>2024-2025 Season Meets</h2>
            <div className="flex-gap">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedMeets(
                  selectedMeets.length === currentSeasonMeets.length
                    ? []
                    : currentSeasonMeets.map(m => m.id)
                )}
                disabled={importing || autoImporting}
              >
                {selectedMeets.length === currentSeasonMeets.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="btn btn-success"
                onClick={autoImportAll}
                disabled={importing || autoImporting || selectedMeets.length === 0}
              >
                Auto-Import Selected ({selectedMeets.length})
              </button>
            </div>
          </div>

          <p className="text-muted mb-3">
            Select meets to import, then use "Import Results" for individual meets or "Auto-Import" for all selected
          </p>

          {currentSeasonMeets.length === 0 ? (
            <p className="text-muted">Loading meets...</p>
          ) : (
            <div className="grid grid-2">
              {currentSeasonMeets.map(meet => (
                <div
                  key={meet.id}
                  className="card"
                  style={{
                    border: selectedMeets.includes(meet.id) ? '2px solid #3498db' : '1px solid #e0e0e0'
                  }}
                >
                  <div className="flex-between mb-2">
                    <h3 style={{ fontSize: '1.1rem' }}>{meet.name}</h3>
                    <input
                      type="checkbox"
                      checked={selectedMeets.includes(meet.id)}
                      onChange={() => toggleMeetSelection(meet.id)}
                      disabled={importing || autoImporting}
                      style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                    />
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Date: {meet.date} | {meet.gender === 'M' ? 'Men' : 'Women'}
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => importSingleMeet(meet.id, meet.name)}
                    disabled={importing || autoImporting}
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
            Simply paste a TFRRS meet URL and we'll automatically extract the meet name, date, gender, and distance!
          </p>

          <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', marginBottom: '1rem' }}>
            <strong>✨ Automatic Extraction:</strong>
            <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
              <li>Meet name from the page title</li>
              <li>Meet date from the page content</li>
              <li>Race distance (5K, 6K, 8K, 10K)</li>
              <li>Gender (Men's / Women's races)</li>
            </ul>
          </div>

          <form onSubmit={importCustomMeet}>
            <div className="form-group">
              <label className="form-label">TFRRS Meet URL *</label>
              <input
                type="url"
                className="form-input"
                value={customMeetUrl}
                onChange={e => setCustomMeetUrl(e.target.value)}
                placeholder="https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships"
                disabled={importing || autoImporting}
                required
              />
              <small className="text-muted">
                Find meet URLs at <a href="https://xc.tfrrs.org/" target="_blank" rel="noopener noreferrer">xc.tfrrs.org</a>
                <br />
                URL must contain "/results/xc/" and be from tfrrs.org
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={importing || autoImporting || !customMeetUrl}
            >
              {importing ? 'Importing...' : 'Import Meet'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Important Notes</h2>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li><strong>Rate Limiting:</strong> TFRRS may block requests if you import too many meets too quickly</li>
            <li><strong>Import Time:</strong> Each meet takes 1-2 minutes. Auto-import can take 15-30 minutes for all meets</li>
            <li><strong>Duplicates:</strong> Athletes are matched by name + school. Duplicates won't be created</li>
            <li><strong>PRs:</strong> Personal records are automatically updated when faster times are found</li>
            <li><strong>One at a Time:</strong> For best results, import meets individually rather than using auto-import</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ImportDataImproved;
