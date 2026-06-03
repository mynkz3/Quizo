// Speed-based scoring: a correct answer scales linearly with the
// time remaining when it was submitted. Wrong answers score 0.
//   score = maxPoints * (timeRemaining / timeLimit)

/**
 * @param {boolean} isCorrect
 * @param {number}  timeTakenMs   time taken to answer, in milliseconds
 * @param {number}  timeLimitSec  question time limit, in seconds
 * @param {number}  maxPoints     points awarded for an instant correct answer
 * @returns {number} rounded score (0 if wrong or answered after time ran out)
 */
function calculateScore(isCorrect, timeTakenMs, timeLimitSec, maxPoints = 1000) {
  if (!isCorrect) {
    return 0;
  }

  const timeLimitMs = timeLimitSec * 1000;
  const timeRemainingMs = timeLimitMs - timeTakenMs;

  if (timeRemainingMs <= 0) {
    return 0;
  }

  return Math.round(maxPoints * (timeRemainingMs / timeLimitMs));
}

module.exports = { calculateScore };

