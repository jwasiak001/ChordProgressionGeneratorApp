import React, { useState, useEffect, useMemo } from 'react';
import { MODES, KEYS, generateProgression, diatonicChord } from './chordEngine';

const SCALE_LABEL = {
  major: 'Major', minor: 'Minor', dorian: 'Dorian', phrygian: 'Phrygian',
  lydian: 'Lydian', mixolydian: 'Mixo.', harmonicMin: 'Harm. min',
};

export function QuizTab({ t, accent, engineRef }) {
  const [puzzle, setPuzzle] = useState(null);
  const [guess, setGuess] = useState({ keyPc: null, mode: null, length: 4, degrees: Array(4).fill(null) });
  const [revealed, setRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [activeSlot, setActiveSlot] = useState(0);

  useEffect(() => {
    const e = engineRef.current;
    const prevStep = e.onStep, prevStop = e.onStop;
    e.onStep = (i) => setActiveIdx(i);
    e.onStop = () => { setIsPlaying(false); setActiveIdx(-1); };
    return () => { e.onStep = prevStep; e.onStop = prevStop; e.stop(); };
  }, []);

  const play = async (progOverride) => {
    const prog = progOverride || (puzzle && puzzle.progression);
    if (!prog) return;
    setIsPlaying(true);
    await engineRef.current.playProgression(prog, 80, t.sound || 'piano', { loop: false, metronome: false });
  };

  const newRound = async () => {
    const keyPc = Math.floor(Math.random() * 12);
    const modes = Object.keys(MODES);
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const length = 3 + Math.floor(Math.random() * 3);
    const progression = generateProgression(keyPc, mode, length, { extension: 'triad' });
    setPuzzle({ keyPc, mode, length, progression });
    setGuess({ keyPc: null, mode: null, length: 4, degrees: Array(4).fill(null) });
    setRevealed(false);
    setActiveSlot(0);
    await play(progression);
  };

  const togglePlay = async () => {
    if (isPlaying) { engineRef.current.stop(); return; }
    await play();
  };

  const setLength = (n) => {
    setGuess(g => {
      const degrees = Array(n).fill(null).map((_, i) => g.degrees[i] ?? null);
      return { ...g, length: n, degrees };
    });
    setActiveSlot(s => (s >= n ? 0 : s));
  };

  const fillSlot = (deg) => {
    setGuess(g => {
      const degrees = [...g.degrees];
      degrees[activeSlot] = deg;
      let next = activeSlot + 1;
      if (next >= g.length) next = degrees.findIndex(d => d === null);
      if (next < 0) next = activeSlot;
      setActiveSlot(next);
      return { ...g, degrees };
    });
  };

  const clearSlot = (idx) => {
    setGuess(g => {
      const degrees = [...g.degrees];
      degrees[idx] = null;
      return { ...g, degrees };
    });
    setActiveSlot(idx);
  };

  const scaleForRoman = guess.mode || 'major';
  const romanLabels = useMemo(() => {
    const pattern = MODES[scaleForRoman].pattern;
    return [0, 1, 2, 3, 4, 5, 6].map(d => diatonicChord(0, pattern, d, { extension: 'triad' }).roman);
  }, [scaleForRoman]);

  // ── Empty state ──
  if (!puzzle) {
    return (
      <div style={tabWrap}>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40,
            background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.24 0 0)',
            display: 'grid', placeItems: 'center', color: accent.color,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
              <path d="M9 9a3 3 0 1 1 4 2.8c-.8.4-1 1-1 1.7" />
              <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
              Train your ear
            </div>
            <div style={{ fontSize: 13, color: 'oklch(0.6 0 0)', lineHeight: 1.45 }}>
              Listen to a random progression and guess the key, scale, length and roman numerals.
            </div>
          </div>
          <button onClick={newRound} style={primaryBtn(accent)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const correct = {
    key: guess.keyPc === puzzle.keyPc,
    mode: guess.mode === puzzle.mode,
    length: guess.length === puzzle.length,
    degrees: puzzle.progression.map((c, i) => guess.degrees[i] === c.degree),
  };
  const totalChecks = 3 + puzzle.progression.length;
  const correctCount =
    (correct.key ? 1 : 0) + (correct.mode ? 1 : 0) + (correct.length ? 1 : 0) +
    correct.degrees.filter(Boolean).length;

  return (
    <div style={tabWrap}>
      <Header />

      {/* Listen card */}
      <div style={{
        padding: 12, marginBottom: 14,
        background: 'oklch(0.16 0 0)', border: '1px solid oklch(0.22 0 0)', borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={togglePlay} style={{
          width: 46, height: 46, borderRadius: 23,
          background: accent.color, color: '#0c0c0d', border: 'none',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          boxShadow: `0 4px 16px ${accent.glow}`, flex: '0 0 auto',
        }}>
          {isPlaying
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
          }
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase', marginBottom: 6 }}>
            Listen
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {puzzle.progression.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i === activeIdx ? accent.color : (i < activeIdx ? 'oklch(0.40 0 0)' : 'oklch(0.24 0 0)'),
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Key guess */}
      <QSection label="Key" right={revealed && <RevealTag ok={correct.key} value={KEYS[puzzle.keyPc].name} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
          {KEYS.map(k => (
            <button key={k.i}
              onClick={() => {
                engineRef.current.playOne({ notes: [k.name + '4'] }, t.sound || 'piano', 0.7);
                if (!revealed) setGuess(g => ({ ...g, keyPc: k.i }));
              }}
              disabled={revealed}
              style={{
                ...chip(guess.keyPc === k.i, accent, revealed && k.i === puzzle.keyPc, revealed && guess.keyPc === k.i && k.i !== puzzle.keyPc),
                fontFamily: '"JetBrains Mono", monospace',
                padding: '7px 0', fontSize: 12,
                cursor: revealed ? 'default' : 'pointer',
              }}>
              {k.name}
            </button>
          ))}
        </div>
      </QSection>

      {/* Scale guess */}
      <QSection label="Scale" right={revealed && <RevealTag ok={correct.mode} value={SCALE_LABEL[puzzle.mode]} />}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {Object.keys(MODES).map(m => (
            <button key={m}
              onClick={() => !revealed && setGuess(g => ({ ...g, mode: m }))}
              disabled={revealed}
              style={{
                ...chip(guess.mode === m, accent, revealed && m === puzzle.mode, revealed && guess.mode === m && m !== puzzle.mode),
                padding: '6px 11px', fontSize: 11.5,
                cursor: revealed ? 'default' : 'pointer',
              }}>
              {SCALE_LABEL[m]}
            </button>
          ))}
        </div>
      </QSection>

      {/* Chords: length stepper + slot row + keypad */}
      <QSection label="Chords" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {revealed && <RevealTag ok={correct.length} value={puzzle.length} />}
          <LengthStepper value={guess.length} onChange={setLength} accent={accent} disabled={revealed} />
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${guess.length}, 1fr)`, gap: 5 }}>
          {guess.degrees.map((d, i) => {
            const isActive = !revealed && i === activeSlot;
            const showCorrect = revealed && i < puzzle.progression.length && correct.degrees[i];
            const showWrong   = revealed && i < puzzle.progression.length && !correct.degrees[i];
            const showExtra   = revealed && i >= puzzle.progression.length;
            return (
              <button key={i}
                onClick={() => revealed ? null : (d === null ? setActiveSlot(i) : clearSlot(i))}
                disabled={revealed}
                style={{
                  background: isActive ? 'oklch(0.22 0 0)'
                    : showCorrect ? 'oklch(0.32 0.10 145)'
                    : (showWrong || showExtra) ? 'oklch(0.30 0.12 25)'
                    : 'oklch(0.16 0 0)',
                  color: 'oklch(0.96 0 0)',
                  border: '1px solid ' + (
                    isActive ? accent.color
                    : showCorrect ? 'oklch(0.55 0.16 145)'
                    : (showWrong || showExtra) ? 'oklch(0.55 0.18 25)'
                    : 'oklch(0.24 0 0)'),
                  borderRadius: 10, minHeight: 46,
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                  cursor: revealed ? 'default' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, padding: 4,
                  boxShadow: isActive ? `0 0 0 2px ${accent.glow}` : 'none',
                  transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
                }}>
                <span>{d === null ? '·' : romanLabels[d]}</span>
                {revealed && i < puzzle.progression.length && !correct.degrees[i] && (
                  <span style={{ fontSize: 10, opacity: 0.75 }}>{puzzle.progression[i].roman}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Roman keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 8 }}>
          {romanLabels.map((label, deg) => (
            <button key={deg}
              onClick={() => !revealed && fillSlot(deg)}
              disabled={revealed}
              style={{
                padding: '8px 0',
                background: 'oklch(0.20 0 0)',
                border: '1px solid oklch(0.26 0 0)',
                borderRadius: 9,
                color: revealed ? 'oklch(0.4 0 0)' : 'oklch(0.92 0 0)',
                fontSize: 12, fontWeight: 500,
                fontFamily: 'inherit',
                cursor: revealed ? 'default' : 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>
      </QSection>

      <div style={{ flex: 1, minHeight: 0 }} />

      {/* Score (revealed only) */}
      {revealed && (
        <div style={{
          marginBottom: 10, padding: '10px 14px',
          background: 'oklch(0.16 0 0)', border: '1px solid oklch(0.24 0 0)',
          borderRadius: 12,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
            Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 22, fontWeight: 600, color: accent.color, lineHeight: 1 }}>
              {correctCount}
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: 'oklch(0.5 0 0)', lineHeight: 1 }}>/</span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: 'oklch(0.5 0 0)', lineHeight: 1 }}>{totalChecks}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ ...primaryBtn(accent), width: '100%' }}>
          Check
        </button>
      ) : (
        <button onClick={newRound} style={{ ...primaryBtn(accent), width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" />
          </svg>
          Next round
        </button>
      )}
    </div>
  );
}

// ── Sub-components ──

function Header() {
  return (
    <header style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
        Ear
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>
        Training
      </div>
    </header>
  );
}

function QSection({ label, right, children }) {
  return (
    <section style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6, minHeight: 22,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
          {label}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function LengthStepper({ value, onChange, accent, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.24 0 0)',
      borderRadius: 9, padding: 2, gap: 2,
    }}>
      <button onClick={() => !disabled && onChange(Math.max(2, value - 1))} disabled={disabled} style={miniStep(disabled)}>−</button>
      <div style={{
        minWidth: 22, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13, fontWeight: 500, color: 'oklch(0.95 0 0)',
      }}>{value}</div>
      <button onClick={() => !disabled && onChange(Math.min(7, value + 1))} disabled={disabled} style={miniStep(disabled)}>+</button>
    </div>
  );
}

function RevealTag({ ok, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 8,
      background: ok ? 'oklch(0.30 0.10 145)' : 'oklch(0.28 0.12 25)',
      color: '#fff', fontSize: 11, fontWeight: 500,
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {ok
          ? <polyline points="20 6 9 17 4 12" />
          : <g><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>
        }
      </svg>
      {value}
    </div>
  );
}

// ── Style helpers ──

const tabWrap = {
  width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column',
  padding: '54px 22px 8px',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

function chip(active, accent, revealCorrect, revealWrong) {
  let bg = 'oklch(0.18 0 0)', bd = 'oklch(0.24 0 0)', fg = 'oklch(0.85 0 0)';
  if (active)        { bg = accent.color; bd = accent.color; fg = '#0c0c0d'; }
  if (revealCorrect) { bg = 'oklch(0.32 0.10 145)'; bd = 'oklch(0.55 0.16 145)'; fg = '#fff'; }
  if (revealWrong)   { bg = 'oklch(0.18 0 0)'; bd = 'oklch(0.40 0.16 25)'; fg = 'oklch(0.55 0.16 25)'; }
  return {
    background: bg, color: fg, border: '1px solid ' + bd,
    borderRadius: 9, fontFamily: 'inherit',
    fontWeight: active ? 600 : 500,
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
  };
}

function miniStep(disabled) {
  return {
    width: 22, height: 22, borderRadius: 6,
    background: disabled ? 'transparent' : 'oklch(0.22 0 0)',
    color: disabled ? 'oklch(0.4 0 0)' : 'oklch(0.95 0 0)',
    border: 'none', fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
    padding: 0, display: 'grid', placeItems: 'center',
  };
}

function primaryBtn(accent) {
  return {
    padding: '14px 18px',
    background: 'oklch(0.18 0 0)',
    border: '1px solid oklch(0.24 0 0)',
    borderRadius: 12,
    color: accent.color,
    fontFamily: 'inherit',
    fontSize: 14, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
}
