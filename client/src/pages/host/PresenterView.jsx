// The projector screen. Like the participant view it adapts per server state,
// but adds the live answer chart, scoreboard, Q&A panel, and the host's
// private correct-answer data for the reveal.

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import Podium from '../../components/Podium';

// Answer colors and shapes, matched to the participant option tiles.
const OPTION_COLORS = ['var(--option-red)', 'var(--option-blue)', 'var(--option-yellow)', 'var(--option-green)'];
const SHAPES = ['▲', '◆', '●', '■'];

function PresenterView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pin } = location.state || {};

  const [gameStatus, setGameStatus] = useState('slide_view');
  const [currentSlide, setCurrentSlide] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [answerStats, setAnswerStats] = useState({ counts: [], total: 0, participants: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Full slide including correctAnswer — host only, used for the reveal.
  const [hostSlide, setHostSlide] = useState(null);

  useEffect(() => {
    if (!pin) {
      navigate('/host/create');
      return;
    }

    const handleStateChange = (data) => {
      setGameStatus(data.status);
      setCurrentSlide(data.slide);
      setSlideIndex(data.currentSlideIndex);
      setTotalSlides(data.totalSlides);

      // On a fresh navigation timeRemaining is undefined, so fall back to the
      // full limit; on a resync the server sends the real time left.
      if (data.status === 'question_view' && data.slide?.timeLimit) {
        setTimeLeft(data.timeRemaining ?? data.slide.timeLimit);
        // Reset counts for the new question, keeping the known participant count.
        setAnswerStats(prev => ({
          counts: new Array(data.slide.options.length).fill(0),
          total: 0,
          participants: prev.participants,
        }));
      } else {
        setTimeLeft(null);
      }
    };

    const handleHostSlideData = (data) => {
      setHostSlide(data.slide);
    };

    const handleAnswerStats = (data) => {
      setAnswerStats({
        counts: data.answerCounts,
        total: data.totalAnswered,
        participants: data.totalParticipants,
      });
    };

    const handleLeaderboard = (data) => {
      setLeaderboard(data.leaderboard);
    };

    const handleQnaQuestions = (data) => {
      setQuestions(data.questions);
    };

    socket.on('state-change', handleStateChange);
    socket.on('host-slide-data', handleHostSlideData);
    socket.on('answer-stats', handleAnswerStats);
    socket.on('leaderboard-data', handleLeaderboard);
    socket.on('final-leaderboard', handleLeaderboard);
    socket.on('qna-questions', handleQnaQuestions);

    // Request current state once listeners are wired up — covers first
    // navigation from the lobby and a mid-game refresh.
    socket.emit('get-state', { pin });

    return () => {
      socket.off('state-change', handleStateChange);
      socket.off('host-slide-data', handleHostSlideData);
      socket.off('answer-stats', handleAnswerStats);
      socket.off('leaderboard-data', handleLeaderboard);
      socket.off('final-leaderboard', handleLeaderboard);
      socket.off('qna-questions', handleQnaQuestions);
    };
  }, [pin, navigate]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleNext = () => socket.emit('advance-slide', { pin });
  const handleShowLeaderboard = () => socket.emit('show-leaderboard', { pin });
  const handleToggleSpotlight = (playerId, questionId) =>
    socket.emit('toggle-spotlight', { pin, playerId, questionId });

  const renderContent = () => {
    if (!currentSlide && !['ended', 'leaderboard'].includes(gameStatus)) return <div className="spinner"></div>;

    switch (gameStatus) {
      // --- Info slide ---
      case 'slide_view':
        return (
          <div className="flex-col gap-lg text-center items-center" style={{ width: '100%', maxWidth: '820px' }}>
            <p className="label">Slide {slideIndex + 1} of {totalSlides}</p>
            <p className="display" style={{ fontSize: '3rem', margin: 'var(--space-lg) 0' }}>
              {currentSlide.title}
            </p>
            {currentSlide.content && (
              <div className="card" style={{ maxWidth: '100%', fontSize: '1.4rem', textAlign: 'left', lineHeight: '1.8' }}>
                {currentSlide.content}
              </div>
            )}
          </div>
        );

      // --- MCQ question + LIVE bar chart ---
      case 'question_view':
        return (
          <div className="flex-col gap-lg" style={{ width: '100%', maxWidth: '1000px' }}>
            <div className="flex-row justify-between items-center">
              <p className="label">Slide {slideIndex + 1} of {totalSlides}</p>
              <p className="label">{answerStats.total} / {answerStats.participants} answered</p>
            </div>

            <div className="question-bubble" style={{ marginBottom: 'var(--space-xl)' }}>
              <p className="title" style={{ fontSize: '2.2rem' }}>{currentSlide.title}</p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2xl)', alignItems: 'center' }}>
              {/* Giant timer */}
              <div style={{ flex: '0 0 160px', textAlign: 'center' }}>
                <div className="timer-badge" style={{
                  width: '150px', height: '150px', fontSize: '4.5rem',
                  margin: '0 auto',
                  color: timeLeft <= 5 ? 'var(--crimson)' : timeLeft <= 10 ? 'var(--gold)' : 'var(--ink)',
                }}>
                  {timeLeft}
                </div>
              </div>

              {/* Live bar chart */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)',
                height: '300px', padding: 'var(--space-md)',
                background: 'var(--surface)', border: 'var(--border-w) solid var(--ink)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
              }}>
                {currentSlide.options.map((_opt, idx) => {
                  const count = answerStats.counts[idx] || 0;
                  const maxCount = Math.max(...answerStats.counts, 1);
                  const heightPct = (count / maxCount) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                      <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '1.3rem' }}>{count}</span>
                      {/* Bar grows as answers arrive; empty bars keep a 5% stub so all options stay visible. */}
                      <div style={{
                        width: '100%',
                        height: `${count > 0 ? Math.max(heightPct, 5) : 5}%`,
                        background: OPTION_COLORS[idx],
                        border: 'var(--border-w) solid var(--ink)',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        transition: 'height 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      }}></div>
                      <div style={{
                        width: '100%', padding: 'var(--space-sm)', textAlign: 'center',
                        background: OPTION_COLORS[idx], color: '#fff',
                        border: 'var(--border-w) solid var(--ink)', borderRadius: 'var(--radius-sm)',
                        fontSize: '1.2rem',
                      }}>
                        {SHAPES[idx]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Correct answer reveal when time is up */}
            {timeLeft === 0 && hostSlide && hostSlide.correctAnswer !== undefined && (
              <div className="card text-center" style={{ marginTop: 'var(--space-lg)', maxWidth: '100%', background: 'var(--tint-gold)' }}>
                <p className="label">Correct Answer</p>
                <p className="title">{SHAPES[hostSlide.correctAnswer]} {currentSlide.options[hostSlide.correctAnswer]}</p>
              </div>
            )}
          </div>
        );

      // --- Scoreboard rows ---
      case 'leaderboard':
        return (
          <div className="flex-col gap-lg text-center items-center" style={{ width: '100%', maxWidth: '600px' }}>
            <p className="display" style={{ fontSize: '3rem' }}>Scoreboard</p>
            <div className="leaderboard">
              {leaderboard.slice(0, 5).map((player) => (
                <div
                  key={player.rank}
                  className={`leaderboard__item ${player.rank <= 3 ? `leaderboard__item--${player.rank}` : ''}`}
                >
                  <span className="leaderboard__rank">{player.rank}</span>
                  <span className="leaderboard__name">{player.nickname}</span>
                  <span className="leaderboard__score">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        );

      // --- Q&A panel ---
      case 'qna_session':
        return (
          <div className="flex-col gap-lg" style={{ width: '100%', maxWidth: '1000px' }}>
            <p className="display text-center" style={{ fontSize: '2.6rem' }}>Q&amp;A Session</p>
            <p className="subtitle text-center mb-lg">Participants are submitting questions on their devices.</p>

            {/* Spotlighted question */}
            {questions.filter(q => q.isSpotlighted).map(q => (
              <div key={`spot-${q.id}`} className="card" style={{ maxWidth: '100%', boxShadow: 'var(--shadow-glow)', margin: 'var(--space-md) 0', position: 'relative' }}>
                <button
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'var(--crimson)', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 900 }}
                  onClick={() => handleToggleSpotlight(q.playerId, q.id)}
                  title="Remove spotlight"
                >
                  ✕
                </button>
                <p className="label" style={{ color: 'var(--primary)', marginBottom: 'var(--space-md)' }}>★ Question from {q.nickname}</p>
                <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 }}>{q.text}</p>
              </div>
            ))}

            {/* Other questions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              {questions.filter(q => !q.isSpotlighted).map(q => (
                <div key={q.id} className="card" style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-lg)' }}>
                  <div className="flex-row justify-between items-center">
                    <span className="label">{q.nickname}</span>
                    <button className="btn btn--primary" style={{ padding: '4px 12px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)' }} onClick={() => handleToggleSpotlight(q.playerId, q.id)}>
                      Spotlight
                    </button>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{q.text}</p>
                </div>
              ))}
              {questions.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                  Waiting for questions to come in…
                </div>
              )}
            </div>
          </div>
        );

      // --- Game over → podium ---
      case 'ended':
        return (
          <div className="flex-col gap-xl text-center items-center" style={{ width: '100%', maxWidth: '720px' }}>
            <div>
              <p className="display" style={{ fontSize: '4rem' }}>GAME OVER!</p>
              <p className="subtitle" style={{ fontSize: '1.4rem' }}>Final Standings</p>
            </div>
            {leaderboard.length > 0 && <Podium top3={leaderboard.slice(0, 3)} />}
          </div>
        );

      default:
        return <div className="spinner"></div>;
    }
  };

  return (
    <div className="page" style={{ justifyContent: 'space-between' }}>

      {/* Top bar */}
      <div className="topbar justify-between" style={{ justifyContent: 'space-between' }}>
        <span className="brand">QuizLive <span style={{ color: 'var(--ink)' }}>Host</span></span>
        <span className="label">Game PIN: <strong style={{ color: 'var(--primary)', fontSize: '1.1rem', letterSpacing: '2px' }}>{pin}</strong></span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '70px', marginBottom: '90px' }}>
        {renderContent()}
      </div>

      {/* Host control bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)',
        padding: 'var(--space-lg) var(--space-xl)',
        background: 'var(--surface)', borderTop: 'var(--border-w) solid var(--ink)',
      }}>
        {gameStatus === 'question_view' && timeLeft === 0 && (
          <button className="btn" onClick={handleShowLeaderboard}>🏆 Show Leaderboard</button>
        )}
        {gameStatus !== 'ended' && (
          <button className="btn btn--primary" onClick={handleNext}>Next Slide ➡️</button>
        )}
        {gameStatus === 'ended' && (
          <button className="btn btn--primary" onClick={() => navigate('/host/create')}>Create New Game</button>
        )}
      </div>
    </div>
  );
}

export default PresenterView;
