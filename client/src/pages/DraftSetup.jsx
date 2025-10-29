import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardSounds } from '../hooks/useKeyboardSounds';
import { useSounds } from '../hooks/useSounds';

function DraftSetup() {
  const navigate = useNavigate();
  const keyboardRef = useKeyboardSounds(); // Enable keyboard sounds
  const { playClick, playSuccess, playDelete } = useSounds();
  const [draftName, setDraftName] = useState('');
  const [totalRounds, setTotalRounds] = useState(7);
  const [snakeDraft, setSnakeDraft] = useState(true);
  const [gender, setGender] = useState('M');
  const [teams, setTeams] = useState([
    { name: '', owner_name: '' },
    { name: '', owner_name: '' }
  ]);

  const addTeam = () => {
    playClick();
    setTeams([...teams, { name: '', owner_name: '' }]);
  };

  const removeTeam = (index) => {
    if (teams.length > 2) {
      playDelete();
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const updateTeam = (index, field, value) => {
    const updated = [...teams];
    updated[index][field] = value;
    setTeams(updated);
  };

  const createDraft = async () => {
    try {
      // Create draft
      const draftRes = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName,
          total_rounds: totalRounds,
          snake_draft: snakeDraft,
          gender: gender
        })
      });

      const draft = await draftRes.json();

      // Create teams
      const teamPromises = teams.map(team =>
        fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...team,
            draft_id: draft.id
          })
        }).then(res => res.json())
      );

      const createdTeams = await Promise.all(teamPromises);

      // Set draft order (random for now)
      const teamIds = createdTeams.map(t => t.id).sort(() => Math.random() - 0.5);

      await fetch(`/api/draft/${draft.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds })
      });

      playSuccess(); // Victory sound!
      navigate(`/draft/${draft.id}`);
    } catch (error) {
      console.error('Error creating draft:', error);
      alert('Failed to create draft');
    }
  };

  const isValid = draftName && teams.every(t => t.name && t.owner_name);

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Create New Draft</h1>
        </div>

        <div className="form-group">
          <label className="form-label">Draft Name</label>
          <input
            ref={keyboardRef}
            type="text"
            className="form-input"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            placeholder="e.g., 2024 Cross Country League"
          />
        </div>

        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Total Rounds</label>
            <input
              type="number"
              className="form-input"
              value={totalRounds}
              onChange={e => setTotalRounds(parseInt(e.target.value))}
              min="1"
              max="15"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Draft Type</label>
            <select
              className="form-select"
              value={snakeDraft ? 'snake' : 'linear'}
              onChange={e => setSnakeDraft(e.target.value === 'snake')}
            >
              <option value="snake">Snake Draft</option>
              <option value="linear">Linear Draft</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Gender *</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1.5rem', border: `2px solid ${gender === 'M' ? '#3498db' : '#e0e0e0'}`, borderRadius: '8px', background: gender === 'M' ? '#e3f2fd' : 'white', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="gender"
                value="M"
                checked={gender === 'M'}
                onChange={e => setGender(e.target.value)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: gender === 'M' ? 'bold' : 'normal', color: gender === 'M' ? '#3498db' : '#666' }}>Men's</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1.5rem', border: `2px solid ${gender === 'F' ? '#e74c3c' : '#e0e0e0'}`, borderRadius: '8px', background: gender === 'F' ? '#fce4ec' : 'white', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="gender"
                value="F"
                checked={gender === 'F'}
                onChange={e => setGender(e.target.value)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: gender === 'F' ? 'bold' : 'normal', color: gender === 'F' ? '#e74c3c' : '#666' }}>Women's</span>
            </label>
          </div>
          <small className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>
            Only athletes of the selected gender will be available in the draft
          </small>
        </div>

        <div className="card-header mt-3">
          <div className="flex-between">
            <h2>Teams</h2>
            <button className="btn btn-secondary" onClick={addTeam}>
              + Add Team
            </button>
          </div>
        </div>

        {teams.map((team, index) => (
          <div key={index} className="card" style={{ marginBottom: '1rem' }}>
            <div className="flex-between mb-2">
              <h3>Team {index + 1}</h3>
              {teams.length > 2 && (
                <button
                  className="btn btn-danger"
                  onClick={() => removeTeam(index)}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={team.name}
                  onChange={e => updateTeam(index, 'name', e.target.value)}
                  placeholder="e.g., Speed Demons"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={team.owner_name}
                  onChange={e => updateTeam(index, 'owner_name', e.target.value)}
                  placeholder="e.g., John Smith"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex-between mt-3">
          <button
            className="btn btn-secondary"
            onClick={() => {
              playClick();
              navigate('/');
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={createDraft}
            disabled={!isValid}
          >
            Create Draft
          </button>
        </div>
      </div>
    </div>
  );
}

export default DraftSetup;
