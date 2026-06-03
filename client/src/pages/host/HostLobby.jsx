// Host's pre-game lobby: shows the room PIN and the players joining live,
// with controls to kick players and start the game.

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import { avatarColor, avatarInitial } from '../../avatar';

function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pin } = location.state || {};

  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pin) {
      navigate('/host/create');
      return;
    }

    // Claim this session as the host.
    socket.emit('host-join', { pin });

    const handlePlayerList = (data) => {
      setPlayers(data.players);
    };

    const handleError = (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('player-list', handlePlayerList);
    socket.on('error-message', handleError);

    return () => {
      socket.off('player-list', handlePlayerList);
      socket.off('error-message', handleError);
    };
  }, [pin, navigate]);

  const handleKick = (playerId) => {
    socket.emit('kick-player', { pin, playerId });
  };

  const handleStartGame = () => {
    if (players.length === 0 && !window.confirm('No players have joined yet. Start anyway?')) {
      return;
    }
    socket.emit('start-game', { pin });
    navigate('/host/presenter', { state: { pin } });
  };

  return (
    <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '8vh' }}>
      <div className="flex-col gap-xl items-center" style={{ width: '100%', maxWidth: '820px' }}>

        <div className="brand" style={{ fontSize: '1.5rem' }}>QuizLive <span style={{ color: 'var(--ink)' }}>Host</span></div>

        {/* PIN plinth (dark, glowing numbers) */}
        <div className="pin-plinth text-center flex-col gap-md items-center">
          <p className="subtitle" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Join at <strong style={{ color: '#fff' }}>{window.location.host}</strong> with Game PIN:
          </p>
          <div className="pin-display">{pin}</div>
        </div>

        {/* Start controls card */}
        <div className="card flex-row items-center justify-between" style={{ maxWidth: '100%' }}>
          <p className="title">
            👥 {players.length} <span className="label" style={{ display: 'block' }}>Player{players.length !== 1 ? 's' : ''} joined</span>
          </p>
          <button className="btn btn--primary btn--large" onClick={handleStartGame}>
            ▶ Start Game
          </button>
        </div>

        {/* Live player pills */}
        {players.length > 0 ? (
          <div className="player-list">
            {players.map((player) => (
              <span key={player.id} className="player-chip">
                <span className="player-chip__avatar" style={{ background: avatarColor(player.nickname) }}>
                  {avatarInitial(player.nickname)}
                </span>
                {player.nickname}
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--crimson)', cursor: 'pointer', padding: 0, marginLeft: '2px', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}
                  onClick={() => handleKick(player.id)}
                  title="Kick player"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="subtitle waiting">⏳ Waiting for players to join…</p>
        )}

      </div>
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}

export default HostLobby;
