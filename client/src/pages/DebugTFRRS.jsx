import { useState } from 'react';

function DebugTFRRS() {
  const [url, setUrl] = useState('https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships');
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const inspectPage = async (e) => {
    e.preventDefault();
    setInspecting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/debug/inspect-tfrrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Inspection failed');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Debug TFRRS Page Structure</h1>
          <p className="text-muted">
            Inspect what's actually on a TFRRS page to help debug import issues
          </p>
        </div>

        <form onSubmit={inspectPage}>
          <div className="form-group">
            <label className="form-label">TFRRS URL</label>
            <input
              type="url"
              className="form-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.tfrrs.org/results/xc/..."
              disabled={inspecting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={inspecting || !url}
          >
            {inspecting ? 'Inspecting...' : 'Inspect Page'}
          </button>
        </form>

        {error && (
          <div className="card mt-3" style={{ background: '#f8d7da', border: '1px solid #dc3545' }}>
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-3">
            <div className="card">
              <h2>Page Information</h2>
              <p><strong>Title:</strong> {result.pageTitle}</p>
              <p><strong>URL:</strong> {result.url}</p>
            </div>

            <div className="card mt-3">
              <h2>Headers Found ({result.headers.length})</h2>
              {result.headers.length === 0 ? (
                <p className="text-muted">No headers found</p>
              ) : (
                <ul style={{ paddingLeft: '1.5rem' }}>
                  {result.headers.map((h, i) => (
                    <li key={i}>
                      <strong>{h.tag}:</strong> {h.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card mt-3">
              <h2>Tables Found ({result.tables.length})</h2>
              {result.tables.length === 0 ? (
                <p className="text-muted">No tables found on page!</p>
              ) : (
                result.tables.map((table, i) => (
                  <div key={i} className="card mb-3" style={{ background: '#f8f9fa' }}>
                    <h3>Table {i + 1}</h3>
                    <p><strong>Row Count:</strong> {table.rowCount}</p>

                    <h4>Headers:</h4>
                    <pre style={{ background: 'white', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
                      {JSON.stringify(table.headers, null, 2)}
                    </pre>

                    <h4>Sample Rows (first 3):</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <tbody>
                          {table.sampleRows.map((row, j) => (
                            <tr key={j}>
                              {row.map((cell, k) => (
                                <td key={k} style={{ fontSize: '0.875rem' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card mt-3">
              <h2>Diagnosis</h2>
              {result.tables.length === 0 ? (
                <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '6px' }}>
                  <h3>⚠️ No Tables Found!</h3>
                  <p>The page doesn't have any HTML tables, or they're loaded dynamically with JavaScript.</p>
                  <h4>Possible reasons:</h4>
                  <ul>
                    <li>TFRRS requires JavaScript to load results</li>
                    <li>Results are in a different format (JSON, iframe, etc.)</li>
                    <li>The page is empty or has no results yet</li>
                    <li>TFRRS blocked the request</li>
                  </ul>
                  <h4>Solutions:</h4>
                  <ul>
                    <li>Try manually visiting the URL in your browser to see if results load</li>
                    <li>Check if results are posted yet</li>
                    <li>Try a different meet URL</li>
                  </ul>
                </div>
              ) : (
                <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '6px' }}>
                  <h3>✅ Tables Found!</h3>
                  <p>Found {result.tables.length} table(s) on the page.</p>
                  <p>Check the headers and sample rows above to see if they match expected format.</p>
                  <h4>Expected format:</h4>
                  <p>Headers should include: Place/Pl, Name, Year/Yr, Team/School, Time</p>
                  <p>Sample rows should have athlete names, schools, and times (MM:SS)</p>
                </div>
              )}
            </div>

            <div className="card mt-3">
              <h2>Raw Data</h2>
              <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugTFRRS;
