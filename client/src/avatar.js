// Shared helpers so a nickname always maps to the same colored avatar badge
// across the lobby, leaderboard, and podium.

const AVATAR_COLORS = [
  '#1C44E6', // blue
  '#E21B3C', // crimson
  '#C9A100', // gold
  '#1FA14D', // green
  '#7A3CE6', // purple
  '#E8761B', // orange
];

// Hash the nickname to a stable color (no flicker between renders/screens).
export function avatarColor(nickname = '') {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function avatarInitial(nickname = '') {
  return (nickname.trim()[0] || '?').toUpperCase();
}
