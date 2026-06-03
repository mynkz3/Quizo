// The participant's adaptive controller. It renders a different screen for
// each server state (waiting, MCQ grid, Q&A input, leaderboard, podium),
// switching whenever a 'state-change' event arrives.

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import Podium from '../../components/Podium';

// Answer shapes matched to option colors 0–3.
const SHAPES = ['▲', '◆', '●', '■'];

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initial state handed over from the lobby on navigation.
  const {
    playerId,
    nickname,
    sessionPin,
    status: initialStatus,
    slide: initialSlide,
    currentSlideIndex: initialSlideIndex,
    totalSlides: initialTotalSlides,
  } = location.state || {};

  const [gameStatus, setGameStatus] = useState(initialStatus || 'slide_view');
  const [currentSlide, setCurrentSlide] = useState(initialSlide || null);
  const [slideIndex, setSlideIndex] = useState(initialSlideIndex || 0);
  const [totalSlides, setTotalSlides] = useState(initialTotalSlides || 0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questionText, setQuestionText] = useState('');
  const [questionSent, setQuestionSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId) {
      navigate('/');
      return;
    }

    const handleStateChange = (data) => {
      setGameStatus(data.status);
      setCurrentSlide(data.slide);
      setSlideIndex(data.currentSlideIndex);
      setTotalSlides(data.totalSlides);

      // Reset per-slide state on every transition.
      setHasAnswered(false);
      setFeedback(null);
      setQuestionSent(false);
      setQuestionText('');

      if (data.status === 'question_view' && data.slide?.timeLimit) {
        setTimeLeft(data.slide.timeLimit);
      } else {
        setTimeLeft(null);
      }
    };

    const handleFeedback = (data) => {
      setFeedback(data);
    };

    const handleLeaderboard = (data) => {
      setLeaderboard(data.leaderboard);
    };

    const handleFinalLeaderboard = (data) => {
      setLeaderboard(data.leaderboard);
    };

    const handleError = (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('state-change', handleStateChange);
    socket.on('answer-feedback', handleFeedback);
    socket.on('leaderboard-data', handleLeaderboard);
    socket.on('final-leaderboard', handleFinalLeaderboard);
    socket.on('error-message', handleError);

    return () => {
      socket.off('state-change', handleStateChange);
      socket.off('answer-feedback', handleFeedback);
      socket.off('leaderboard-data', handleLeaderboard);
      socket.off('final-leaderboard', handleFinalLeaderboard);
      socket.off('error-message', handleError);
    };
  }, [playerId, navigate]);

  // Local countdown; the authoritative timing lives on the server.
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleAnswer = useCallback((optionIndex) => {
    if (hasAnswered) return;

    setHasAnswered(true);
    socket.emit('submit-answer', {
      pin: sessionPin,
      playerId,
      selectedOption: optionIndex,
    });
  }, [hasAnswered, sessionPin, playerId]);

  const handleSubmitQuestion = () => {
    if (!questionText.trim()) return;

    socket.emit('submit-question', {
      pin: sessionPin,
      playerId,
      questionText: questionText.trim(),
    });

    setQuestionSent(true);
    setQuestionText('');
  };

  // Pick the screen for the current server state.
  const renderContent = () => {
    // Once answered, show feedback until the next state change.
    if (hasAnswered && feedback) {
      return (
        <div className="feedback">
          <div className="feedback__icon">
            {feedback.isCorrect ? '✅' : '❌'}
          </div>
          <p className="title">
            {feedback.isCorrect ? 'Correct!' : 'Wrong!'}
          </p>
          <p className="feedback__score">
            +{feedback.pointsEarned} pts
          </p>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <p className="subtitle">Total Score: <strong>{feedback.totalScore}</strong></p>
            <p className="text-secondary" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
              Rank: {feedback.rank} / {feedback.totalPlayers}
            </p>
          </div>
        </div>
      );
    }

    switch (gameStatus) {
      // --- Info Slide → Waiting Screen ---
      case 'slide_view':
        return (
          <div className="waiting flex-col gap-lg text-center">
            <p style={{ fontSize: '4rem' }}>📺</p>
            <p className="title">Look at the<br />Main Screen</p>
            <p className="subtitle">
              The host is showing an information slide
            </p>
            <p className="label">
              Slide {slideIndex + 1} of {totalSlides}
            </p>
          </div>
        );

      // --- MCQ Question → Answer Grid ---
      case 'question_view':
        if (!currentSlide) return null;
        return (
          <div className="flex-col gap-lg items-center" style={{ width: '100%', maxWidth: '480px' }}>
            {/* Question header: slide counter + circular timer badge */}
            <div className="flex-row justify-between items-center" style={{ width: '100%' }}>
              <span className="label">{slideIndex + 1} of {totalSlides}</span>
              <span className={`timer-badge ${timeLeft <= 5 ? 'timer--danger' : timeLeft <= 10 ? 'timer--warning' : ''}`}>
                {timeLeft}
              </span>
            </div>

            {/* Question shown in a speech bubble with a tail */}
            <div className="question-bubble" style={{ width: '100%', marginBottom: 'var(--space-md)' }}>
              <p className="title" style={{ fontSize: '1.4rem' }}>{currentSlide.title}</p>
            </div>

            {/* Answer Options — Kahoot-style color/shape grid */}
            <div className="options-grid">
              {currentSlide.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-btn option-btn--${index}`}
                  onClick={() => handleAnswer(index)}
                  disabled={hasAnswered || timeLeft === 0}
                >
                  <span className="option-btn__shape">{SHAPES[index]}</span>
                  {option}
                </button>
              ))}
            </div>

            {timeLeft === 0 && !hasAnswered && (
              <p className="subtitle text-center">⏰ Time's up!</p>
            )}
          </div>
        );

      // --- Q&A Session → Text Input ---
      case 'qna_session':
        return (
          <div className="flex-col gap-lg text-center" style={{ width: '100%', maxWidth: '480px' }}>
            <p style={{ fontSize: '3rem' }}>❓</p>
            <p className="title">Ask a Question</p>
            <p className="subtitle">Submit your question to the host</p>

            {!questionSent ? (
              <div className="flex-col gap-md">
                <textarea
                  className="input"
                  placeholder="Type your question here..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  style={{ resize: 'none' }}
                />
                <button
                  className="btn btn--primary btn--full"
                  onClick={handleSubmitQuestion}
                  disabled={!questionText.trim()}
                >
                  Submit Question
                </button>
              </div>
            ) : (
              <div className="card text-center">
                <p style={{ fontSize: '2rem' }}>✅</p>
                <p className="subtitle mt-md">Question submitted!</p>
              </div>
            )}
          </div>
        );

      // --- Leaderboard ---
      case 'leaderboard':
        return (
          <div className="flex-col gap-lg text-center items-center" style={{ width: '100%', maxWidth: '480px' }}>
            <p className="display" style={{ fontSize: '2.4rem' }}>Scoreboard</p>
            <div className="leaderboard">
              {leaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`leaderboard__item ${player.rank <= 3 ? `leaderboard__item--${player.rank}` : ''} ${player.nickname === nickname ? 'leaderboard__item--you' : ''}`}
                >
                  <span className="leaderboard__rank">{player.rank}</span>
                  <span className="leaderboard__name">
                    {player.nickname}{player.nickname === nickname && ' (You)'}
                  </span>
                  <span className="leaderboard__score">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        );

      // --- Game Over → Podium ---
      case 'ended':
        return (
          <div className="flex-col gap-lg text-center items-center" style={{ width: '100%', maxWidth: '480px' }}>
            <div>
              <p className="display" style={{ fontSize: '2.8rem' }}>GAME OVER!</p>
              <p className="subtitle">Final Standings</p>
            </div>

            {leaderboard.length > 0 && (
              <Podium top3={leaderboard.slice(0, 3)} youName={nickname} />
            )}

            <button
              className="btn btn--primary btn--full mt-lg"
              onClick={() => navigate('/')}
            >
              ↻ Play Again
            </button>
          </div>
        );

      default:
        return (
          <div className="waiting text-center">
            <div className="spinner" style={{ margin: '0 auto var(--space-md)' }}></div>
            <p className="subtitle">Loading...</p>
          </div>
        );
    }
  };

  return (
    <div className="page">
      {renderContent()}
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}

export default GamePage;
