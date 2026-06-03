// A Participant is one player in a session. Kept in its own collection
// (not embedded in Session) so scores can be queried, updated, and sorted
// independently for leaderboards.

const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  sessionPin: {
    type: String,
    required: true,
  },
  nickname: {
    type: String,
    required: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  // Running total across all answered questions.
  score: {
    type: Number,
    default: 0,
  },

  // One entry per answered question; used to prevent double-answering
  // and to aggregate the live results chart.
  answers: [
    {
      slideIndex: {
        type: Number,
        required: true,
      },
      selectedOption: {
        type: Number,
        required: true,
      },
      isCorrect: {
        type: Boolean,
        required: true,
      },
      pointsEarned: {
        type: Number,
        default: 0,
      },
      answeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Questions submitted during Q&A slides.
  questions: [
    {
      text: {
        type: String,
        required: true,
      },
      isSpotlighted: {
        type: Boolean,
        default: false,
      },
      submittedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

}, {
  timestamps: true,
});

module.exports = mongoose.model('Participant', participantSchema);
