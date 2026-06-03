// First screen on the participant's phone: enter a PIN and nickname, then
// emit 'player-join'. On success the server replies and we move to the lobby.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../socket';

function JoinPage() {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();

    if (!pin.trim() || pin.length !== 6) {
      setError('Please enter a valid 6-digit PIN');
      return;
    }
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (nickname.trim().length > 20) {
      setError('Nickname must be 20 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('player-join', {
      pin: pin.trim(),
      nickname: nickname.trim(),
    });
  };

  // Register listeners once on mount so they don't stack up on re-renders.
  useEffect(() => {
    // Pass the player identity to the lobby via router state.
    const handleJoinSuccess = (data) => {
      setLoading(false);
      navigate('/lobby', {
        state: {
          playerId: data.playerId,
          nickname: data.nickname,
          sessionPin: data.sessionPin,
        },
      });
    };

    const handleError = (data) => {
      setLoading(false);
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('join-success', handleJoinSuccess);
    socket.on('error-message', handleError);

    return () => {
      socket.off('join-success', handleJoinSuccess);
      socket.off('error-message', handleError);
    };
  }, [navigate]);

  return (
    <div className="page">
      <div className="card flex-col gap-lg">
        <div className="text-center flex-col gap-sm">
          <div style={{ fontSize: '3rem' }}>🎮</div>
          <div className="display" style={{ fontSize: '2.6rem' }}>QuizLive</div>
          <p className="subtitle">Enter a PIN to join the game!</p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} className="flex-col gap-md">
          {/* PIN Input */}
          <div>
            <label className="label">Game PIN</label>
            <input
              type="text"
              className="input input--pin"
              placeholder="000000"
              value={pin}
              onChange={(e) => {
                // Only allow digits, max 6 characters
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
              }}
              maxLength={6}
              inputMode="numeric"  // Shows number keyboard on phones
              autoComplete="off"
            />
          </div>

          {/* Nickname Input */}
          <div>
            <label className="label">Nickname</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
          </div>

          {/* Join Button */}
          <button
            type="submit"
            className="btn btn--primary btn--full btn--large"
            disabled={loading || !pin || !nickname.trim()}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>

        {/* Error Toast */}
        {error && <div className="error-toast">{error}</div>}
      </div>
    </div>
  );
}

export default JoinPage;
