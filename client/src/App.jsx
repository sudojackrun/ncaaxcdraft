import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import DraftSetup from './pages/DraftSetup';
import DraftRoom from './pages/DraftRoomEnhanced';
import DraftBoard from './pages/DraftBoard';
import TeamView from './pages/TeamView';
import Athletes from './pages/AthletesImproved';
import Meets from './pages/Meets';
import MeetDetail from './pages/MeetDetail';
import ImportData from './pages/ImportDataImproved';
import DebugTFRRS from './pages/DebugTFRRS';
import LiveRaceView from './pages/LiveRaceView';
import SoundToggle from './components/SoundToggle';
import { useSounds } from './hooks/useSounds';

function App() {
  const { playNavigate } = useSounds();

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <h1>NCAA XC DRAFT</h1>
            <ul className="nav-links">
              <li><Link to="/" onClick={playNavigate}>Home</Link></li>
              <li><Link to="/athletes" onClick={playNavigate}>Athletes</Link></li>
              <li><Link to="/meets" onClick={playNavigate}>Meets</Link></li>
              <li><Link to="/import" onClick={playNavigate}>Import</Link></li>
            </ul>
          </div>
        </nav>

        <SoundToggle />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/draft/setup" element={<DraftSetup />} />
          <Route path="/draft/:id" element={<DraftRoom />} />
          <Route path="/draft/:id/board" element={<DraftBoard />} />
          <Route path="/draft/:draftId/live-race" element={<LiveRaceView />} />
          <Route path="/team/:id" element={<TeamView />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/meets" element={<Meets />} />
          <Route path="/meets/:id" element={<MeetDetail />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/debug" element={<DebugTFRRS />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
