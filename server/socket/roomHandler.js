// Handles players and host joining/leaving a room. Socket.io "rooms" are
// keyed by the session PIN, so emitting to a room reaches everyone in that game.

const Session = require('../models/Session');
const Participant = require('../models/Participant');

// Build the player list payload broadcast on every roster change.
async function getPlayerList(pin) {
  const players = await Participant.find({ sessionPin: pin });
  return players.map(p => ({ id: p._id, nickname: p.nickname, score: p.score }));
}

function roomHandler(io, socket) {

  socket.on('host-join', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) {
        socket.emit('error-message', { message: 'Session not found' });
        return;
      }

      session.hostSocketId = socket.id;
      await session.save();
      socket.join(pin);

      socket.emit('player-list', { players: await getPlayerList(pin) });
    } catch (error) {
      console.error('Error in host-join:', error);
      socket.emit('error-message', { message: 'Failed to join as host' });
    }
  });

  socket.on('player-join', async ({ pin, nickname }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) {
        socket.emit('error-message', { message: 'Invalid PIN. Session not found.' });
        return;
      }
      if (session.status !== 'lobby') {
        socket.emit('error-message', { message: 'Game has already started.' });
        return;
      }

      const existingPlayer = await Participant.findOne({ sessionPin: pin, nickname });
      if (existingPlayer) {
        socket.emit('error-message', { message: 'Nickname already taken. Choose another.' });
        return;
      }

      const participant = await Participant.create({
        sessionPin: pin,
        nickname,
        socketId: socket.id,
      });
      socket.join(pin);

      socket.emit('join-success', {
        playerId: participant._id,
        nickname: participant.nickname,
        sessionPin: pin,
      });

      io.to(pin).emit('player-list', { players: await getPlayerList(pin) });
    } catch (error) {
      console.error('Error in player-join:', error);
      socket.emit('error-message', { message: 'Failed to join session' });
    }
  });

  socket.on('kick-player', async ({ pin, playerId }) => {
    try {
      const participant = await Participant.findByIdAndDelete(playerId);
      if (!participant) return;

      // Force the kicked socket out of the room and notify it.
      const playerSocket = io.sockets.sockets.get(participant.socketId);
      if (playerSocket) {
        playerSocket.leave(pin);
        playerSocket.emit('kicked', { message: 'You have been removed from the game.' });
      }

      io.to(pin).emit('player-list', { players: await getPlayerList(pin) });
    } catch (error) {
      console.error('Error in kick-player:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const participant = await Participant.findOne({ socketId: socket.id });
      if (participant) {
        await Participant.findByIdAndDelete(participant._id);
        io.to(participant.sessionPin).emit('player-list', {
          players: await getPlayerList(participant.sessionPin),
        });
      }

      // If the host drops, keep the session alive in case they reconnect.
      const session = await Session.findOne({ hostSocketId: socket.id });
      if (session) {
        session.hostSocketId = null;
        await session.save();
      }
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
  });
}

module.exports = roomHandler;
