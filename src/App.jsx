import React from 'react';
import { IOSDevice } from './IOSFrame';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from './TweaksPanel';
import { MODES, KEYS, SOUNDS, AudioEngine, generateProgression } from './chordEngine';
import { QuizTab } from './QuizTab';

// ─── Accent palette ──────────────────────────────────────────────────────────

const ACCENTS = {
  amber:   { color: 'oklch(0.82 0.16 78)',  glow: 'oklch(0.82 0.16 78 / 0.30)'  },
  electric:{ color: 'oklch(0.78 0.16 250)', glow: 'oklch(0.78 0.16 250 / 0.30)' },
  lime:    { color: 'oklch(0.86 0.18 130)', glow: 'oklch(0.86 0.18 130 / 0.30)' },
  magenta: { color: 'oklch(0.74 0.20 330)', glow: 'oklch(0.74 0.20 330 / 0.30)' },
  white:   { color: 'oklch(0.96 0 0)',      glow: 'oklch(0.96 0 0 / 0.20)'      },
};

const TWEAK_DEFAULTS = {
  accent: 'amber',
  notation: 'both',
  tempo: 84,
  sound: 'piano',
  loop: false,
  metronome: false,
};

// ─── App (shell: tabs + shared engine + tweaks) ───────────────────────────────

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const accent = ACCENTS[t.accent] || ACCENTS.amber;
  const [tab, setTab] = React.useState('generator');

  const engineRef = React.useRef(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();

  // Stop playback whenever the user switches tabs
  React.useEffect(() => { engineRef.current.stop(); }, [tab]);
  React.useEffect(() => () => { engineRef.current.stop(); engineRef.current.dispose(); }, []);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0c0c0d',
      color: 'oklch(0.95 0 0)',
      fontFamily: '"Inter", -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'generator' && (
          <GeneratorTab t={t} setTweak={setTweak} accent={accent} engineRef={engineRef} />
        )}
        {tab === 'quiz' && (
          <QuizTab t={t} accent={accent} engineRef={engineRef} />
        )}
      </div>
      <BottomNav tab={tab} onTab={setTab} accent={accent} />
    </div>
  );
}

// ─── Bottom navigation ────────────────────────────────────────────────────────

function BottomNav({ tab, onTab, accent }) {
  const items = [
    {
      id: 'generator', label: 'Generator',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8"  cy="8"  r="1.2" fill="currentColor" />
          <circle cx="16" cy="16" r="1.2" fill="currentColor" />
          <circle cx="16" cy="8"  r="1.2" fill="currentColor" />
          <circle cx="8"  cy="16" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'quiz', label: 'Quiz',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.3 9.3a2.7 2.7 0 1 1 3.7 3.4c-.9.4-1 1-1 1.8" />
          <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
  ];

  return (
    <nav style={{
      flex: '0 0 auto',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      borderTop: '1px solid oklch(0.20 0 0)',
      background: 'oklch(0.10 0 0 / 0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      paddingBottom: 30,
      paddingTop: 8,
    }}>
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => onTab(it.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: active ? accent.color : 'oklch(0.55 0 0)',
            padding: '6px 0', fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}>
            {it.icon}
            <div style={{ fontSize: 10.5, letterSpacing: '0.06em', fontWeight: active ? 600 : 500 }}>
              {it.label}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Generator tab ────────────────────────────────────────────────────────────

function GeneratorTab({ t, setTweak, accent, engineRef }) {
  const [keyPc, setKeyPc] = React.useState(0);
  const [mode, setMode] = React.useState('major');
  const [length, setLength] = React.useState(4);
  const [extension, setExtension] = React.useState('triad');
  const [progression, setProgression] = React.useState([]);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [beatTick, setBeatTick] = React.useState(0);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const soundScrollerRef = React.useRef(null);

  const scrollSounds = () => {
    const el = soundScrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    el.scrollTo({
      left: el.scrollLeft >= max - 4 ? 0 : Math.min(max, el.scrollLeft + el.clientWidth * 0.7),
      behavior: 'smooth',
    });
  };

  React.useEffect(() => {
    const e = engineRef.current;
    e.onStep = (i) => setActiveIdx(i);
    e.onStop = () => setIsPlaying(false);
    e.onBeat = () => setBeatTick(n => n + 1);
    return () => { e.stop(); };
  }, []);

  React.useEffect(() => { engineRef.current.setBpm(t.tempo); }, [t.tempo]);
  React.useEffect(() => { engineRef.current.setLoop(t.loop); }, [t.loop]);
  React.useEffect(() => { engineRef.current.setMetronome(t.metronome); }, [t.metronome]);

  const regen = React.useCallback(() => {
    const p = generateProgression(keyPc, mode, length, { extension });
    setProgression(p);
    setActiveIdx(-1);
    if (engineRef.current?.playing) engineRef.current.swapProgression(p);
  }, [keyPc, mode, length, extension]);

  React.useEffect(() => { regen(); }, [keyPc, mode, length, extension]);

  const handlePlay = async () => {
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await engineRef.current.playProgression(progression, t.tempo, t.sound, {
      loop: t.loop, metronome: t.metronome,
    });
  };

  const handleTapChord = async (i) => {
    if (isPlaying) return;
    setActiveIdx(i);
    await engineRef.current.playOne(progression[i], t.sound, 1.2);
    setTimeout(() => setActiveIdx(idx => idx === i ? -1 : idx), 900);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '54px 22px 8px',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
            Chord
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>
            Progression
          </div>
        </div>
        <button
          onClick={() => setTweaksOpen(o => !o)}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: tweaksOpen ? accent.color : 'oklch(0.18 0 0)',
            border: '1px solid ' + (tweaksOpen ? accent.color : 'oklch(0.24 0 0)'),
            color: tweaksOpen ? '#0c0c0d' : 'oklch(0.65 0 0)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            transition: 'background 0.12s, color 0.12s',
          }}
          aria-label="Appearance"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Key selector */}
      <Section label="Key">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {KEYS.map(k => (
            <button key={k.i} onClick={() => setKeyPc(k.i)} style={{
              ...chipStyle(keyPc === k.i, accent),
              fontFamily: '"JetBrains Mono", monospace',
              padding: '9px 0', fontSize: 13, letterSpacing: '-0.01em',
            }}>
              {k.name}
            </button>
          ))}
        </div>
      </Section>

      {/* Mode selector */}
      <Section label="Scale">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.keys(MODES).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              ...chipStyle(mode === m, accent),
              padding: '8px 12px', fontSize: 12.5, flex: '0 0 auto',
            }}>
              {MODES[m].label}
            </button>
          ))}
        </div>
      </Section>

      {/* Length */}
      <Section label="Length" right={
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'oklch(0.55 0 0)' }}>
          {length} chords
        </span>
      }>
        <Stepper value={length} min={2} max={8} onChange={setLength} accent={accent} />
      </Section>

      <div style={{ flex: 1, minHeight: 0 }} />

      {/* Randomize */}
      <button onClick={regen} style={{
        width: '100%', marginTop: 8, marginBottom: 14, padding: '20px 16px',
        background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.24 0 0)',
        borderRadius: 14, color: accent.color, fontFamily: 'inherit',
        fontSize: 15, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        transition: 'background 0.12s, transform 0.08s',
      }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <circle cx="8"  cy="8"  r="1.2" fill="currentColor"/>
          <circle cx="16" cy="16" r="1.2" fill="currentColor"/>
          <circle cx="16" cy="8"  r="1.2" fill="currentColor"/>
          <circle cx="8"  cy="16" r="1.2" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
        </svg>
        Randomize
      </button>

      {/* Chord grid */}
      <div style={{ marginBottom: 10 }}>
        <ProgressionGrid
          progression={progression}
          activeIdx={activeIdx}
          onTap={handleTapChord}
          notation={t.notation}
          accent={accent}
        />
      </div>

      {/* Extension selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4, padding: 3,
        background: 'oklch(0.14 0 0)', border: '1px solid oklch(0.22 0 0)',
        borderRadius: 12, marginBottom: 14,
      }}>
        {[
          { value: 'triad', label: 'Triad' },
          { value: '7',     label: '7' },
          { value: '9',     label: '9' },
          { value: '11',    label: '11' },
          { value: '13',    label: '13' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setExtension(opt.value)} style={{
            padding: '7px 0',
            background: extension === opt.value ? accent.color : 'transparent',
            color: extension === opt.value ? '#0c0c0d' : 'oklch(0.75 0 0)',
            border: 'none', borderRadius: 9, fontFamily: 'inherit',
            fontSize: 12, fontWeight: extension === opt.value ? 600 : 500,
            letterSpacing: '0.04em', cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Play bar */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10, padding: '12px',
        background: 'oklch(0.18 0 0)', borderRadius: 22,
        border: '1px solid oklch(0.24 0 0)',
      }}>
        {/* Row 1: play + sounds */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handlePlay} style={{
            width: 52, height: 52, borderRadius: 26,
            background: accent.color, color: '#0c0c0d',
            border: 'none', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            boxShadow: `0 6px 24px ${accent.glow}`,
            transition: 'transform 0.1s', flex: '0 0 auto',
          }}>
            {isPlaying
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            }
          </button>

          <div
            ref={soundScrollerRef}
            className="hide-scroll"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', minWidth: 0, scrollBehavior: 'smooth' }}
          >
            {Object.entries(SOUNDS).map(([k, s]) => (
              <button key={k} onClick={() => setTweak('sound', k)} style={{
                ...soundChipStyle(t.sound === k), flex: '0 0 auto',
              }}>
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={scrollSounds} aria-label="More sounds" style={{
            width: 28, height: 28, borderRadius: 14,
            background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.28 0 0)',
            color: 'oklch(0.85 0 0)', display: 'grid', placeItems: 'center',
            cursor: 'pointer', flex: '0 0 auto',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Row 2: loop + metronome + tempo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid oklch(0.24 0 0)' }}>
          <IconToggle label="Loop" active={t.loop} accent={accent} onClick={() => setTweak('loop', !t.loop)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </IconToggle>

          <IconToggle label="Click" active={t.metronome} accent={accent} onClick={() => setTweak('metronome', !t.metronome)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 21 L12 3 L18 21 Z"/>
              <line x1="7.5" y1="17" x2="16.5" y2="17"/>
              <line x1="12" y1="12" x2="16" y2="6"/>
            </svg>
          </IconToggle>

          <div style={{ flex: 1, minWidth: 0 }}>
            <TempoMeter
              value={t.tempo}
              onChange={v => setTweak('tempo', v)}
              accent={accent}
              isPlaying={isPlaying}
              metroOn={t.metronome}
              beatTick={beatTick}
            />
          </div>
        </div>
      </div>

      {/* Appearance tweaks panel (overlay) */}
      <TweaksPanel title="Appearance" open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
        <TweakSection label="Accent" />
        <div style={{ display: 'flex', gap: 8, padding: '4px 0 12px' }}>
          {Object.entries(ACCENTS).map(([k, v]) => (
            <button key={k} onClick={() => setTweak('accent', k)} style={{
              width: 28, height: 28, borderRadius: 14,
              background: v.color,
              border: t.accent === k ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', padding: 0,
            }} aria-label={k} />
          ))}
        </div>
        <TweakSection label="Notation" />
        <TweakRadio
          label="Chord labels"
          value={t.notation}
          options={[{ value: 'names', label: 'Names' }, { value: 'roman', label: 'Roman' }, { value: 'both', label: 'Both' }]}
          onChange={v => setTweak('notation', v)}
        />
      </TweaksPanel>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children, right }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'oklch(0.55 0 0)', textTransform: 'uppercase' }}>
          {label}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function chipStyle(active, accent) {
  return {
    background: active ? accent.color : 'oklch(0.18 0 0)',
    color: active ? '#0c0c0d' : 'oklch(0.85 0 0)',
    border: '1px solid ' + (active ? accent.color : 'oklch(0.24 0 0)'),
    borderRadius: 10, fontFamily: 'inherit',
    fontWeight: active ? 600 : 500, cursor: 'pointer',
    transition: 'background 0.12s, color 0.12s',
  };
}

function soundChipStyle(active) {
  return {
    background: active ? 'oklch(0.96 0 0)' : 'transparent',
    color: active ? '#0c0c0d' : 'oklch(0.7 0 0)',
    border: '1px solid ' + (active ? 'oklch(0.96 0 0)' : 'oklch(0.28 0 0)'),
    borderRadius: 14, padding: '5px 11px', fontSize: 11.5,
    fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
    letterSpacing: '0.01em',
  };
}

function Stepper({ value, min, max, onChange, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.24 0 0)',
      borderRadius: 12, padding: 3, gap: 0, width: '100%',
    }}>
      <StepBtn onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</StepBtn>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0' }}>
        {Array.from({ length: max - min + 1 }).map((_, i) => {
          const v = min + i;
          const on = v <= value;
          return (
            <div key={v} style={{
              width: on ? 18 : 6, height: 6, borderRadius: 3,
              background: on ? accent.color : 'oklch(0.30 0 0)',
              transition: 'all 0.2s',
            }} />
          );
        })}
      </div>
      <StepBtn onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</StepBtn>
    </div>
  );
}

function StepBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 32, borderRadius: 9,
      background: disabled ? 'transparent' : 'oklch(0.22 0 0)',
      border: 'none', color: disabled ? 'oklch(0.35 0 0)' : 'oklch(0.9 0 0)',
      fontSize: 18, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'inherit',
    }}>{children}</button>
  );
}

function ProgressionGrid({ progression, activeIdx, onTap, notation, accent }) {
  const n = progression.length;
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  const maxNameLen  = progression.reduce((m, c) => Math.max(m, (c.name  || '').length), 1);
  const maxRomanLen = progression.reduce((m, c) => Math.max(m, (c.roman || '').length), 1);
  const gridW = 358;
  const gap   = 8;
  const cardW = (gridW - (cols - 1) * gap) / cols;
  const innerPad = 12;
  const fit = (len, charW) => (cardW - innerPad) / Math.max(1, len * charW);
  const capByN = n <= 2 ? 56 : n <= 3 ? 48 : n <= 4 ? 40 : n <= 6 ? 30 : 24;
  const nameSize  = Math.max(14, Math.floor(Math.min(capByN, fit(maxNameLen, 0.58))));
  const romanCap  = n <= 2 ? 24 : n <= 3 ? 20 : n <= 4 ? 17 : n <= 6 ? 14 : 11;
  const romanSize = Math.max(10, Math.floor(Math.min(romanCap, fit(maxRomanLen, 0.5) * 0.55)));
  const padY = n <= 2 ? 30 : n <= 3 ? 26 : n <= 4 ? 22 : n <= 6 ? 16 : 12;
  const minH = n <= 2 ? 130 : n <= 3 ? 112 : n <= 4 ? 96 : n <= 6 ? 72 : 58;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {progression.map((c, i) => (
        <ChordCard
          key={i} chord={c} active={i === activeIdx}
          onTap={() => onTap(i)} notation={notation} accent={accent}
          nameSize={nameSize} romanSize={romanSize} padY={padY} minH={minH}
        />
      ))}
    </div>
  );
}

function ChordCard({ chord, active, onTap, notation, accent, nameSize, romanSize, padY, minH }) {
  const showName  = notation === 'names' || notation === 'both';
  const showRoman = notation === 'roman' || notation === 'both';
  return (
    <button onClick={onTap} style={{
      background: active ? accent.color : 'oklch(0.18 0 0)',
      border: '1px solid ' + (active ? accent.color : 'oklch(0.24 0 0)'),
      borderRadius: 14, padding: `${padY}px 4px`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'pointer',
      transition: 'background 0.12s, border-color 0.12s, transform 0.12s, box-shadow 0.12s',
      transform: active ? 'translateY(-2px)' : 'none',
      boxShadow: active ? `0 8px 24px ${accent.glow}` : 'none',
      fontFamily: 'inherit', color: 'inherit', minHeight: minH, overflow: 'hidden',
    }}>
      {showName && (
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: nameSize, fontWeight: 500,
          color: active ? '#0c0c0d' : 'oklch(0.96 0 0)',
          letterSpacing: '-0.03em', lineHeight: 1,
          whiteSpace: 'nowrap', maxWidth: '100%',
        }}>{chord.name}</div>
      )}
      {showRoman && (
        <div style={{
          fontSize: romanSize, fontWeight: 500,
          color: active ? 'oklch(0.20 0 0)' : 'oklch(0.55 0 0)',
          letterSpacing: '0.06em', lineHeight: 1,
          whiteSpace: 'nowrap', marginTop: notation === 'both' ? 2 : 0,
        }}>{chord.roman}</div>
      )}
    </button>
  );
}

function TempoMeter({ value, onChange, accent, isPlaying, metroOn, beatTick }) {
  const beatSec  = 60 / value;
  const pulseKey = `${value}-${isPlaying}`;
  const flash    = metroOn && isPlaying ? beatTick : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range" min={40} max={200} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: accent.color, height: 4 }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 56, justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 500, color: 'oklch(0.95 0 0)' }}>
          {value}
        </span>
        <span style={{ fontSize: 9, letterSpacing: '0.16em', color: 'oklch(0.5 0 0)' }}>BPM</span>
      </div>
      {flash !== null
        ? <FlashDot key={flash} accent={accent} />
        : <PulseDot key={pulseKey} beatSec={beatSec} accent={accent} active={isPlaying} />
      }
    </div>
  );
}

function PulseDot({ beatSec, accent, active }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: 5,
      background: accent.color, opacity: active ? 1 : 0.4,
      animation: `cpg-pulse ${beatSec}s ease-in-out infinite`,
      flex: '0 0 auto',
    }} />
  );
}

function FlashDot({ accent }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: 5,
      background: accent.color,
      animation: 'cpg-flash 0.18s ease-out',
      flex: '0 0 auto',
    }} />
  );
}

function IconToggle({ children, label, active, onClick, accent }) {
  return (
    <button onClick={onClick} title={label} aria-pressed={active} style={{
      width: 36, height: 36, borderRadius: 12,
      background: active ? accent.color : 'oklch(0.22 0 0)',
      color: active ? '#0c0c0d' : 'oklch(0.85 0 0)',
      border: '1px solid ' + (active ? accent.color : 'oklch(0.28 0 0)'),
      display: 'grid', placeItems: 'center', cursor: 'pointer',
      transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      flex: '0 0 auto', boxShadow: active ? `0 0 0 3px ${accent.glow}` : 'none',
    }}>
      {children}
    </button>
  );
}

// ─── Root (responsive scaling wrapper) ───────────────────────────────────────

export function Root() {
  const [scale, setScale] = React.useState(1);
  const W = 402, H = 874;

  React.useEffect(() => {
    const update = () => {
      const s = Math.min(1, (window.innerHeight - 24) / H, (window.innerWidth - 24) / W);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <IOSDevice dark width={W} height={H}>
            <App />
          </IOSDevice>
        </div>
      </div>
    </div>
  );
}
