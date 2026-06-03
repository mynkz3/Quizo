// A Session is one game room: its PIN, current state, slide deck, and host.
// Slides are embedded rather than stored in a separate collection because
// they only ever exist within their session.

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true,
  },

  // Drives the state machine; all clients react to changes of this field.
  status: {
    type: String,
    enum: ['lobby', 'slide_view', 'question_view', 'leaderboard', 'qna_session', 'ended'],
    default: 'lobby',
  },

  currentSlideIndex: {
    type: Number,
    default: 0,
  },

  slides: [
    {
      type: {
        type: String,
        enum: ['info', 'mcq', 'qna'],
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      // Body text for info slides.
      content: {
        type: String,
        default: '',
      },
      // MCQ answer choices.
      options: [{
        type: String,
      }],
      // Index into `options` of the correct choice.
      correctAnswer: {
        type: Number,
      },
      // Seconds; drives both the countdown and the scoring formula.
      timeLimit: {
        type: Number,
        default: 20,
      },
    },
  ],

  hostSocketId: {
    type: String,
    default: null,
  },

  // Set when entering 'question_view'; used to measure answer speed.
  questionStartedAt: {
    type: Date,
    default: null,
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model('Session', sessionSchema);
