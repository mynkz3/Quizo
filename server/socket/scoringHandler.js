// Handles MCQ answer submissions (with speed-based scoring) and the Q&A flow.

const Session = require('../models/Session');
const Participant = require('../models/Participant');
const { calculateScore } = require('../utils/scoring');

// Collect every Q&A question across all participants, newest first.
async function collectQuestions(pin) {
  const participants = await Participant.find({ sessionPin: pin });
  const questions = [];
  participants.forEach(p => {
    p.questions.forEach(q => {
      questions.push({
        id: q._id,
        playerId: p._id,
        nickname: p.nickname,
        text: q.text,
        isSpotlighted: q.isSpotlighted,
        submittedAt: q.submittedAt,
      });
    });
  });
  questions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  return questions;
}

function scoringHandler(io, socket) {

  socket.on('submit-answer', async ({ pin, playerId, selectedOption }) => {
    try {
      const session = await Session.findOne({ pin });
      if (!session) return;
      if (session.status !== 'question_view') {
        socket.emit('error-message', { message: 'Not in question mode.' });
        return;
      }

      const participant = await Participant.findById(playerId);
      if (!participant) return;

      const currentSlide = session.slides[session.currentSlideIndex];

      // Ignore repeat submissions for the same question.
      const alreadyAnswered = participant.answers.some(
        a => a.slideIndex === session.currentSlideIndex
      );
      if (alreadyAnswered) {
        socket.emit('error-message', { message: 'You already answered this question.' });
        return;
      }

      const isCorrect = selectedOption === currentSlide.correctAnswer;

      const now = new Date();
      const timeTakenMs = now.getTime() - session.questionStartedAt.getTime();
      const points = calculateScore(isCorrect, timeTakenMs, currentSlide.timeLimit);

      participant.answers.push({
        slideIndex: session.currentSlideIndex,
        selectedOption,
        isCorrect,
        pointsEarned: points,
        answeredAt: now,
      });
      participant.score += points;
      await participant.save();

      // Personal feedback (this player only): result, points, and live rank.
      const ranked = await Participant.find({ sessionPin: pin }).sort({ score: -1 });
      const rank = ranked.findIndex(p => p._id.toString() === playerId) + 1;

      socket.emit('answer-feedback', {
        isCorrect,
        pointsEarned: points,
        totalScore: participant.score,
        rank,
        totalPlayers: ranked.length,
      });

      // Aggregate counts per option, broadcast to drive the presenter chart.
      const answerCounts = new Array(currentSlide.options.length).fill(0);
      let totalAnswered = 0;
      ranked.forEach(p => {
        const answer = p.answers.find(a => a.slideIndex === session.currentSlideIndex);
        if (answer) {
          answerCounts[answer.selectedOption]++;
          totalAnswered++;
        }
      });

      io.to(pin).emit('answer-stats', {
        answerCounts,
        totalAnswered,
        totalParticipants: ranked.length,
      });
    } catch (error) {
      console.error('Error in submit-answer:', error);
      socket.emit('error-message', { message: 'Failed to submit answer' });
    }
  });

  socket.on('submit-question', async ({ pin, playerId, questionText }) => {
    try {
      const participant = await Participant.findById(playerId);
      if (!participant) return;

      participant.questions.push({ text: questionText, isSpotlighted: false });
      await participant.save();

      io.to(pin).emit('qna-questions', { questions: await collectQuestions(pin) });
    } catch (error) {
      console.error('Error in submit-question:', error);
    }
  });

  socket.on('toggle-spotlight', async ({ pin, playerId, questionId }) => {
    try {
      const participant = await Participant.findById(playerId);
      if (!participant) return;

      const question = participant.questions.id(questionId);
      if (!question) return;

      question.isSpotlighted = !question.isSpotlighted;
      await participant.save();

      io.to(pin).emit('qna-questions', { questions: await collectQuestions(pin) });
    } catch (error) {
      console.error('Error in toggle-spotlight:', error);
    }
  });
}

module.exports = scoringHandler;
