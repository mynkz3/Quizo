// Waiting room shown after joining. Lists connected players live and, when
// the host starts, follows the 'state-change' broadcast into the game.

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import { avatarColor, avatarInitial } from '../../avatar';

function LobbyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId, nickname, sessionPin } = location.state || {};

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Sent here directly without joining? Go back to the start.
    if (!playerId) {
      navigate('/');
      return;
    }

    const handlePlayerList = (data) => {
      setPlayers(data.players);
    };

    // Host started the game — carry the initial state into the game screen.
    const handleStateChange = (data) => {
      navigate('/game', {
        state: {
          playerId,
          nickname,
          sessionPin,
          ...data,
        },
      });
    };

    const handleKicked = () => {
      navigate('/', { state: { message: 'You were removed from the game.' } });
    };

    socket.on('player-list', handlePlayerList);
    socket.on('state-change', handleStateChange);
    socket.on('kicked', handleKicked);

    return () => {
      socket.off('player-list', handlePlayerList);
      socket.off('state-change', handleStateChange);
      socket.off('kicked', handleKicked);
    };
  }, [playerId, nickname, sessionPin, navigate]);

  return (
    <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '5rem' }}>
      <div className="topbar">
        <span className="topbar__pin">PIN: {sessionPin}</span>
      </div>

      <div className="flex-col gap-xl text-center items-center" style={{ width: '100%', maxWidth: '480px' }}>
        {/* "Waiting…" card */}
        <div className="card text-center flex-col gap-sm">
          <p className="title" style={{ fontSize: '2.4rem' }}>Waiting…</p>
          <div className="waiting mt-sm">
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>

        {/* Your nickname pill */}
        <div className="player-chip" style={{ fontSize: '1.1rem' }}>
          <span
            className="player-chip__avatar"
            style={{ background: avatarColor(nickname) }}
          >
            {avatarInitial(nickname)}
          </span>
          {nickname} <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>(You)</span>
        </div>

        <p className="subtitle waiting">Waiting for the host to start…</p>
      </div>
    </div>
  );
}

export default LobbyPage;
