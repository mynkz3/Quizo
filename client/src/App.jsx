import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import JoinPage from './pages/participant/JoinPage';
import LobbyPage from './pages/participant/LobbyPage';
import GamePage from './pages/participant/GamePage';

import SlideCreator from './pages/host/SlideCreator';
import HostLobby from './pages/host/HostLobby';
import PresenterView from './pages/host/PresenterView';

function App() {
  return (
    <Router>
      <Routes>
        {/* Participant */}
        <Route path="/" element={<JoinPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />

        {/* Host */}
        <Route path="/host/create" element={<SlideCreator />} />
        <Route path="/host/lobby" element={<HostLobby />} />
        <Route path="/host/presenter" element={<PresenterView />} />
      </Routes>
    </Router>
  );
}

export default App;
