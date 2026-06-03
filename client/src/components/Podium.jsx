// Winners podium for the final standings, shared by the participant GamePage
// and the host PresenterView. Renders the top 3 as plinths with 1st in the
// centre (tallest), 2nd left, 3rd right.

import { avatarColor, avatarInitial } from '../avatar';

// Per-place styling. `order` uses CSS flex order so 1st place sits in the middle.
const PLACES = {
  1: { color: 'var(--primary)', textColor: '#fff', height: 210, order: 2, crown: '⭐' },
  2: { color: 'var(--crimson)', textColor: '#fff', height: 150, order: 1, crown: null },
  3: { color: 'var(--gold)', textColor: '#15131A', height: 110, order: 3, crown: null },
};

function Podium({ top3 = [], youName }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 'var(--space-md)',
        width: '100%',
        maxWidth: '480px',
      }}
    >
      {top3.map((player) => {
        const place = PLACES[player.rank] || PLACES[3];
        const isYou = youName && player.nickname === youName;
        return (
          <div
            key={player.rank}
            style={{
              order: place.order,
              flex: player.rank === 1 ? '1.2' : '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            {place.crown && <div style={{ fontSize: '1.6rem' }}>{place.crown}</div>}

            {/* Avatar circle */}
            <div
              className="player-chip__avatar"
              style={{
                width: '3.2rem',
                height: '3.2rem',
                fontSize: '1.3rem',
                background: avatarColor(player.nickname),
                boxShadow: isYou ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
              }}
            >
              {avatarInitial(player.nickname)}
            </div>

            {/* Plinth */}
            <div
              style={{
                width: '100%',
                height: `${place.height}px`,
                background: place.color,
                color: place.textColor,
                border: 'var(--border-w) solid var(--ink)',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 'var(--space-md)',
                gap: '2px',
              }}
            >
              <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '1.8rem' }}>
                {player.rank}
              </span>
              <span
                style={{ fontWeight: 800, fontSize: '0.95rem', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {player.nickname}
              </span>
              <span style={{ fontWeight: 700, opacity: 0.9, fontSize: '0.85rem' }}>
                {player.score}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Podium;
