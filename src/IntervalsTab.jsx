import React, { useState, useEffect, useRef } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','A','A','Bb','B'];
const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function midiToNote(midi) {
  const oct = Math.floor(midi / 12) - 1;
  const pc = midi % 12;
  return NOTE_NAMES_SHARP[pc] + oct;
}

const INTERVALS = [
  { semitones: 0,  short: 'P1', name: 'Unison'  },
  { semitones: 1,  short: 'm2', name: 'Min 2nd'  },
  { semitones: 2,  short: 'M2', name: 'Maj 2nd'  },
  { semitones: 3,  short: 'm3', name: 'Min 3rd'  },
  { semitones: 4,  short: 'M3', name: 'Maj 3rd'  },
  { semitones: 5,  short: 'P4', name: 'Per 4th'  },
  { semitones: 6,  short: 'TT', name: 'Tritone'  },
  { semitones: 7,  short: 'P5', name: 'Per 5th'  },
  { semitones: 8,  short: 'm6', name: 'Min 6th'  },
  { semitones: 9,  short: 'M6', name: 'Maj 6th'  },
  { semitones: 10, short: 'm7', name: 'Min 7th'  },
  { semitones: 11, short: 'M7', name: 'Maj 7th'  },
  { semitones: 12, short: 'P8', name: 'Octave'   },
];

export function IntervalsTab({ t, accent, engineRef }) {
  const [puzzle, setPuzzle] = useState(null);
  const [guess, setGuess] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState('ascending'); // 'ascending' | 'harmonic'
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(playTimerRef.current), []);

  const buildPuzzle = () => {
    const rootMidi = 48 + Math.floor(Math.random() * 13); // C3–C4
    const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    return { rootMidi, interval };
  };

  const playPuzzle = async (p, dir) => {
    const d = dir ?? direction;
    const note1 = midiToNote(p.rootMidi);
    const note2 = midiToNote(p.rootMidi + p.interval.semitones);
    const preset = t.sound || 'piano';
    clearTimeout(playTimerRef.current);
    setIsPlaying(true);

    if (d === 'harmonic') {
      await engineRef.current.playOne({ notes: [note1, note2] }, preset, 1.4);
      playTimerRef.current = setTimeout(() => setIsPlaying(false), 1500);
    } else {
      await engineRef.current.playOne({ notes: [note1] }, preset, 0.8);
      playTimerRef.current = setTimeout(async () => {
        await engineRef.current.playOne({ notes: [note2] }, preset, 0.8);
        playTimerRef.current = setTimeout(() => setIsPlaying(false), 900);
      }, 700);
    }
  };

  const newRound = async () => {
    const p = buildPuzzle();
    setPuzzle(p);
    setGuess(null);
    setRevealed(false);
    await playPuzzle(p);
  };

  const togglePlay = () => {
    if (!puzzle) return;
    playPuzzle(puzzle);
  };

  const handleDirection = async (d) => {
    setDirection(d);
    if (puzzle) await playPuzzle(puzzle, d);
  };

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
              <line x1="4" y1="20" x2="4" y2="4" />
              <line x1="4" y1="20" x2="20" y2="20" />
              <polyline points="4,14 9,8 13,12 20,4" />
            </svg>
          </div>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>Interval Trainer</div>
            <div style={{ fontSize: 13, color: 'oklch(0.6 0 0)', lineHeight: 1.45 }}>
              Listen to two notes and identify the interval between them.
            </div>
          </div>
          <button onClick={newRound} style={primaryBtn(accent)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
            Start
          </button>
        </div>
      </div>
    );
  }

  const correct = guess !== null && guess === puzzle.interval.semitones;
  const wrong   = guess !== null && guess !== puzzle.interval.semitones;

  return (
    <div style={tabWrap}>
      <Header />

      {/* Listen card */}
      <div style={{
        padding: '12px 14px', marginBottom: 14,
        background: 'oklch(0.16 0 0)', border: '1px solid oklch(0.22 0 0)', borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={togglePlay} disabled={isPlaying} style={{
          width: 46, height: 46, borderRadius: 23,
          background: accent.color, color: '#0c0c0d', border: 'none',
          display: 'grid', placeItems: 'center', cursor: isPlaying ? 'default' : 'pointer',
          boxShadow: `0 4px 16px ${accent.glow}`, flex: '0 0 auto',
          opacity: isPlaying ? 0.7 : 1, transition: 'opacity 0.12s',
        }}>
          {isPlaying
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
          }
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase', marginBottom: 8 }}>
            Listen
          </div>
          {/* Direction toggle */}
          <div style={{
            display: 'inline-flex', background: 'oklch(0.13 0 0)',
            border: '1px solid oklch(0.22 0 0)', borderRadius: 8, padding: 2, gap: 2,
          }}>
            {['ascending', 'harmonic'].map(d => (
              <button key={d} onClick={() => handleDirection(d)} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: direction === d ? accent.color : 'transparent',
                color: direction === d ? '#0c0c0d' : 'oklch(0.65 0 0)',
                fontSize: 11, fontWeight: direction === d ? 600 : 500,
                fontFamily: 'inherit', cursor: 'pointer',
                textTransform: 'capitalize', letterSpacing: '0.02em',
                transition: 'background 0.12s, color 0.12s',
              }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interval grid */}
      <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase', marginBottom: 6 }}>
        Identify the interval
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 14 }}>
        {INTERVALS.map(iv => {
          const isGuessed  = guess === iv.semitones;
          const isAnswer   = revealed && iv.semitones === puzzle.interval.semitones;
          const isWrong    = revealed && isGuessed && !isAnswer;

          let bg = 'oklch(0.18 0 0)', bd = 'oklch(0.24 0 0)', fg = 'oklch(0.85 0 0)';
          if (!revealed && isGuessed) { bg = accent.color; bd = accent.color; fg = '#0c0c0d'; }
          if (isAnswer)  { bg = 'oklch(0.32 0.10 145)'; bd = 'oklch(0.55 0.16 145)'; fg = '#fff'; }
          if (isWrong)   { bg = 'oklch(0.18 0 0)'; bd = 'oklch(0.40 0.16 25)'; fg = 'oklch(0.55 0.16 25)'; }

          return (
            <button key={iv.semitones}
              onClick={() => !revealed && setGuess(iv.semitones)}
              disabled={revealed}
              style={{
                background: bg, color: fg,
                border: '1px solid ' + bd,
                borderRadius: 10, padding: '10px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                cursor: revealed ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s, color 0.12s, border-color 0.12s',
              }}>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
                {iv.short}
              </span>
              <span style={{ fontSize: 9.5, opacity: 0.7, lineHeight: 1, letterSpacing: '0.02em' }}>
                {iv.name}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0 }} />

      {/* Result banner */}
      {revealed && (
        <div style={{
          marginBottom: 10, padding: '10px 14px',
          background: correct ? 'oklch(0.24 0.08 145)' : 'oklch(0.22 0.10 25)',
          border: '1px solid ' + (correct ? 'oklch(0.45 0.14 145)' : 'oklch(0.45 0.16 25)'),
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: correct ? 'oklch(0.7 0.18 145)' : 'oklch(0.65 0.18 25)', flex: '0 0 auto' }}>
            {correct
              ? <polyline points="20 6 9 17 4 12" />
              : <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>
            }
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(0.95 0 0)', marginBottom: 2 }}>
              {correct ? 'Correct!' : `The interval was ${puzzle.interval.short} — ${puzzle.interval.name}`}
            </div>
            <div style={{ fontSize: 11, color: 'oklch(0.6 0 0)' }}>
              {midiToNote(puzzle.rootMidi)} → {midiToNote(puzzle.rootMidi + puzzle.interval.semitones)}
              {' · '}{puzzle.interval.semitones} semitone{puzzle.interval.semitones !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      {!revealed ? (
        <button
          onClick={() => { if (guess !== null) setRevealed(true); }}
          disabled={guess === null}
          style={{
            ...primaryBtn(accent), width: '100%',
            opacity: guess === null ? 0.4 : 1,
            cursor: guess === null ? 'default' : 'pointer',
          }}>
          Check
        </button>
      ) : (
        <button onClick={newRound} style={{ ...primaryBtn(accent), width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" />
          </svg>
          Next
        </button>
      )}
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

function Header() {
  return (
    <header style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
        Interval
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>
        Trainer
      </div>
    </header>
  );
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
