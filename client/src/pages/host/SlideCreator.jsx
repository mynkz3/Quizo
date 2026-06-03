// The host's deck editor: add, edit, reorder, and delete info / MCQ / Q&A
// slides, then POST the deck to create a session and move to the lobby.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../socket';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    paddingBottom: 'var(--space-2xl)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-md) var(--space-xl)',
    background: 'var(--surface)',
    borderBottom: 'var(--border-w) solid var(--ink)',
    marginBottom: 'var(--space-xl)',
    flexWrap: 'wrap',
    gap: 'var(--space-md)',
  },
  slideList: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  slideCard: {
    background: 'var(--surface)',
    border: 'var(--border-w) solid var(--ink)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: 'var(--space-xl)',
    position: 'relative',
  },
  slideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-md)',
  },
  slideType: {
    display: 'inline-block',
    padding: 'var(--space-xs) var(--space-md)',
    borderRadius: 'var(--radius-full)',
    border: '2px solid var(--ink)',
    fontSize: '0.75rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  fieldGroup: {
    marginBottom: 'var(--space-md)',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '800',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-xs)',
  },
  optionRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center',
    marginBottom: 'var(--space-sm)',
  },
  addBtnGroup: {
    display: 'flex',
    gap: 'var(--space-lg)',
    justifyContent: 'center',
    margin: 'var(--space-2xl) auto',
    maxWidth: '900px',
    padding: '0 var(--space-lg)',
    flexWrap: 'wrap',
  },
  addBtn: {
    borderRadius: 'var(--radius-lg)',
    border: 'var(--border-w) solid var(--ink)',
    boxShadow: 'var(--shadow-md)',
    padding: 'var(--space-xl)',
    color: 'var(--ink)',
    cursor: 'pointer',
    fontFamily: 'Fredoka, sans-serif',
    fontSize: '1.1rem',
    fontWeight: '600',
    flex: '1',
    minWidth: '180px',
    textAlign: 'center',
  },
  moveBtn: {
    background: 'var(--surface)',
    border: '2px solid var(--ink)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--ink)',
    cursor: 'pointer',
    padding: 'var(--space-xs) var(--space-sm)',
    fontFamily: 'inherit',
    fontWeight: '700',
    fontSize: '1rem',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--crimson)',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: 'var(--space-xs)',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-2xl)',
    border: '2px dashed var(--text-muted)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-muted)',
  },
};

// Per-type badge and add-tile colors.
const typeColors = {
  info: { bg: 'var(--tint-gold)', color: 'var(--ink)' },
  mcq: { bg: 'var(--tint-pink)', color: 'var(--ink)' },
  qna: { bg: 'var(--tint-lavender)', color: 'var(--ink)' },
};

const typeLabels = {
  info: '📄 Info Slide',
  mcq: '❓ MCQ Question',
  qna: '💬 Q&A Panel',
};

function SlideCreator() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);

  const addSlide = (type) => {
    const newSlide = {
      type,
      title: '',
      content: '',
      options: type === 'mcq' ? ['', '', '', ''] : [],
      correctAnswer: type === 'mcq' ? 0 : undefined,
      timeLimit: type === 'mcq' ? 20 : undefined,
    };
    setSlides([...slides, newSlide]);
  };

  const updateSlide = (index, field, value) => {
    const updated = [...slides];
    updated[index] = { ...updated[index], [field]: value };
    setSlides(updated);
  };

  const updateOption = (slideIndex, optionIndex, value) => {
    const updated = [...slides];
    const options = [...updated[slideIndex].options];
    options[optionIndex] = value;
    updated[slideIndex] = { ...updated[slideIndex], options };
    setSlides(updated);
  };

  const deleteSlide = (index) => {
    setSlides(slides.filter((_, i) => i !== index));
  };

  // Swap the slide with its neighbour in the given direction (-1 up, +1 down).
  const moveSlide = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const updated = [...slides];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSlides(updated);
  };

  const handleStartSession = async () => {
    if (slides.length === 0) {
      alert('Add at least one slide before starting.');
      return;
    }

    const invalidSlide = slides.find(s => !s.title.trim());
    if (invalidSlide) {
      alert('All slides need a title.');
      return;
    }

    const invalidMcq = slides.find(
      s => s.type === 'mcq' && s.options.some(o => !o.trim())
    );
    if (invalidMcq) {
      alert('All MCQ options must be filled in.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${SERVER_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides }),
      });

      const session = await response.json();

      navigate('/host/lobby', {
        state: { pin: session.pin, sessionId: session._id },
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div className="brand" style={{ fontSize: '1.5rem' }}>QuizLive <span style={{ color: 'var(--ink)' }}>Host</span></div>
        <button
          className="btn btn--primary btn--large"
          onClick={handleStartSession}
          disabled={loading || slides.length === 0}
        >
          {loading ? 'Creating…' : `▶ Go Live (${slides.length})`}
        </button>
      </div>

      {/* Page heading */}
      <div style={{ maxWidth: '900px', margin: '0 auto var(--space-xl)', padding: '0 var(--space-lg)' }}>
        <p className="title" style={{ fontSize: '2.4rem' }}>Slide Creator</p>
        <p className="subtitle">Build your deck — mix info slides, questions, and Q&amp;A.</p>
      </div>

      {/* Slide List */}
      <div style={styles.slideList}>
        {slides.length === 0 && (
          <div style={styles.emptyState}>
            <p style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📑</p>
            <p className="title" style={{ fontSize: '1.5rem' }}>No slides yet</p>
            <p className="subtitle">Add slides below to build your presentation</p>
          </div>
        )}

        {slides.map((slide, index) => (
          <div key={index} style={styles.slideCard}>
            {/* Slide Header */}
            <div style={styles.slideHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span className="label" style={{ color: 'var(--text-muted)' }}>
                  #{index + 1}
                </span>
                <span style={{
                  ...styles.slideType,
                  background: typeColors[slide.type].bg,
                  color: typeColors[slide.type].color,
                }}>
                  {typeLabels[slide.type]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button style={styles.moveBtn} onClick={() => moveSlide(index, -1)} title="Move up">↑</button>
                <button style={styles.moveBtn} onClick={() => moveSlide(index, 1)} title="Move down">↓</button>
                <button style={styles.deleteBtn} onClick={() => deleteSlide(index)} title="Delete">🗑️</button>
              </div>
            </div>

            {/* Title Field (all slide types) */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Title</label>
              <input
                className="input"
                placeholder={slide.type === 'mcq' ? 'Enter your question...' : 'Enter slide title...'}
                value={slide.title}
                onChange={(e) => updateSlide(index, 'title', e.target.value)}
              />
            </div>

            {/* Content Field (info slides) */}
            {slide.type === 'info' && (
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Content</label>
                <textarea
                  className="input"
                  placeholder="Enter information text..."
                  value={slide.content}
                  onChange={(e) => updateSlide(index, 'content', e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            {/* MCQ Options */}
            {slide.type === 'mcq' && (
              <>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Options (select the correct answer)</label>
                  {slide.options.map((option, optIdx) => (
                    <div key={optIdx} style={styles.optionRow}>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name={`correct-${index}`}
                          checked={slide.correctAnswer === optIdx}
                          onChange={() => updateSlide(index, 'correctAnswer', optIdx)}
                        />
                        ✓
                      </label>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: ['var(--option-red)', 'var(--option-blue)', 'var(--option-yellow)', 'var(--option-green)'][optIdx],
                        flexShrink: 0,
                      }} />
                      <input
                        className="input"
                        placeholder={`Option ${optIdx + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, optIdx, e.target.value)}
                        style={{ padding: 'var(--space-sm) var(--space-md)' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Time Limit (seconds)</label>
                  <select
                    className="input"
                    value={slide.timeLimit}
                    onChange={(e) => updateSlide(index, 'timeLimit', parseInt(e.target.value))}
                    style={{ padding: 'var(--space-sm) var(--space-md)' }}
                  >
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds (default)</option>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>
              </>
            )}

            {/* Q&A description */}
            {slide.type === 'qna' && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Participants will see a text field to submit questions for you to answer live.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Slide Buttons — colored tiles matching the slide types */}
      <div style={styles.addBtnGroup}>
        <button
          style={{ ...styles.addBtn, background: 'var(--tint-gold)' }}
          onClick={() => addSlide('info')}
        >
          📄 Add Info Slide
        </button>
        <button
          style={{ ...styles.addBtn, background: 'var(--tint-pink)' }}
          onClick={() => addSlide('mcq')}
        >
          ❓ Add MCQ Question
        </button>
        <button
          style={{ ...styles.addBtn, background: 'var(--tint-lavender)' }}
          onClick={() => addSlide('qna')}
        >
          💬 Add Q&amp;A Panel
        </button>
      </div>
    </div>
  );
}

export default SlideCreator;
