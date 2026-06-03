// The game state machine. When the host advances slides the server derives
// the next state from the slide type and broadcasts it, so every client
// switches screens together:
//
//   lobby -> slide_view (info) / question_view (mcq) / qna_session (qna)
//         -> leaderboard -> ... -> ended

const Session = require('../models/Session');
const Participant = require('../models/Participant');

function stateHandler(io, socket) {

  // A client that just mounted or refreshed asks for the current state
  // instead of waiting for the next broadcast. Without this, refreshing the
  // projector mid-game would leave it blank.
  socket.on('get-state', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;

      const slide = session.slides[session.currentSlideIndex] || null;

      // Compute the real time left so a refreshed client resumes the countdown.
      let timeRemaining;
      if (session.status === 'question_view' && slide && session.questionStartedAt) {
        const elapsedSec = Math.floor((Date.now() - session.questionStartedAt.getTime()) / 1000);
        timeRemaining = Math.max(0, slide.timeLimit - elapsedSec);
      }

      socket.emit('state-change', {
        status: session.status,
        currentSlideIndex: session.currentSlideIndex,
        slide: slide ? sanitizeSlide(slide) : null,
        totalSlides: session.slides.length,
        timeRemaining,
      });

      // The host needs the full slide (including the correct answer) for the reveal.
      if (slide && session.hostSocketId === socket.id) {
        socket.emit('host-slide-data', { slide: toPlainSlide(slide) });
      }

      // Repopulate the live answer chart on resync.
      if (session.status === 'question_view' && slide) {
        socket.emit('answer-stats', await getAnswerStats(pin, session.currentSlideIndex, slide.options.length));
      }

      // Repopulate rankings if on a leaderboard / ended screen.
      if (session.status === 'leaderboard' || session.status === 'ended') {
        const event = session.status === 'ended' ? 'final-leaderboard' : 'leaderboard-data';
        socket.emit(event, { leaderboard: await getLeaderboard(pin) });
      }
    } catch (error) {
      console.error('Error in get-state:', error);
    }
  });

  socket.on('start-game', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;
      if (session.hostSocketId !== socket.id) {
        socket.emit('error-message', { message: 'Only the host can start the game.' });
        return;
      }
      if (session.slides.length === 0) {
        socket.emit('error-message', { message: 'Add at least one slide before starting.' });
        return;
      }

      session.currentSlideIndex = 0;
      const firstSlide = session.slides[0];
      session.status = getStateForSlideType(firstSlide.type);
      session.questionStartedAt = firstSlide.type === 'mcq' ? new Date() : null;
      await session.save();

      broadcastSlide(io, session, firstSlide);
    } catch (error) {
      console.error('Error in start-game:', error);
    }
  });

  socket.on('advance-slide', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;
      if (session.hostSocketId !== socket.id) {
        socket.emit('error-message', { message: 'Only the host can advance slides.' });
        return;
      }

      const nextIndex = session.currentSlideIndex + 1;

      // Past the last slide ends the game.
      if (nextIndex >= session.slides.length) {
        session.status = 'ended';
        session.currentSlideIndex = nextIndex;
        await session.save();

        io.to(pin).emit('state-change', {
          status: 'ended',
          currentSlideIndex: nextIndex,
          slide: null,
          totalSlides: session.slides.length,
        });
        io.to(pin).emit('final-leaderboard', { leaderboard: await getLeaderboard(pin) });
        return;
      }

      const nextSlide = session.slides[nextIndex];
      session.currentSlideIndex = nextIndex;
      session.status = getStateForSlideType(nextSlide.type);
      session.questionStartedAt = nextSlide.type === 'mcq' ? new Date() : null;
      await session.save();

      broadcastSlide(io, session, nextSlide);
    } catch (error) {
      console.error('Error in advance-slide:', error);
    }
  });

  socket.on('show-leaderboard', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;

      session.status = 'leaderboard';
      await session.save();

      io.to(pin).emit('state-change', {
        status: 'leaderboard',
        currentSlideIndex: session.currentSlideIndex,
        slide: null,
        totalSlides: session.slides.length,
      });
      io.to(pin).emit('leaderboard-data', { leaderboard: await getLeaderboard(pin) });
    } catch (error) {
      console.error('Error in show-leaderboard:', error);
    }
  });

  socket.on('end-game', async ({ pin }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;

      session.status = 'ended';
      await session.save();

      io.to(pin).emit('state-change', {
        status: 'ended',
        currentSlideIndex: session.currentSlideIndex,
        slide: null,
        totalSlides: session.slides.length,
      });
      io.to(pin).emit('final-leaderboard', { leaderboard: await getLeaderboard(pin) });
    } catch (error) {
      console.error('Error in end-game:', error);
    }
  });
}

// Broadcast a slide transition: a sanitized slide to everyone, and the full
// slide (with the correct answer) privately to the host for the reveal.
function broadcastSlide(io, session, slide) {
  io.to(session.pin).emit('state-change', {
    status: session.status,
    currentSlideIndex: session.currentSlideIndex,
    slide: sanitizeSlide(slide),
    totalSlides: session.slides.length,
  });

  if (session.hostSocketId) {
    const hostSocket = io.sockets.sockets.get(session.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('host-slide-data', { slide: toPlainSlide(slide) });
    }
  }
}

async function getLeaderboard(pin) {
  const participants = await Participant.find({ sessionPin: pin }).sort({ score: -1 });
  return participants.map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score }));
}

async function getAnswerStats(pin, slideIndex, optionCount) {
  const participants = await Participant.find({ sessionPin: pin });
  const answerCounts = new Array(optionCount).fill(0);
  let totalAnswered = 0;
  participants.forEach(p => {
    const answer = p.answers.find(a => a.slideIndex === slideIndex);
    if (answer) {
      answerCounts[answer.selectedOption]++;
      totalAnswered++;
    }
  });
  return { answerCounts, totalAnswered, totalParticipants: participants.length };
}

function getStateForSlideType(slideType) {
  switch (slideType) {
    case 'info': return 'slide_view';
    case 'mcq': return 'question_view';
    case 'qna': return 'qna_session';
    default: return 'slide_view';
  }
}

function toPlainSlide(slide) {
  return slide.toObject ? slide.toObject() : { ...slide };
}

// Strip the correct answer before sending an MCQ slide to participants,
// so it can't be read off the network.
function sanitizeSlide(slide) {
  const obj = toPlainSlide(slide);
  if (obj.type === 'mcq') {
    const { correctAnswer, ...safe } = obj;
    return safe;
  }
  return obj;
}

module.exports = stateHandler;
