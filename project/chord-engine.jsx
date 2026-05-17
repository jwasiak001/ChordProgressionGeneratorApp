// Chord theory + Tone.js audio engine. Globals exported at bottom.

const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Modes: intervals from tonic (in semitones), 7 notes
const MODES = {
  major:        { label: 'Major',         pattern: [0,2,4,5,7,9,11] },
  minor:        { label: 'Minor',         pattern: [0,2,3,5,7,8,10] },
  dorian:       { label: 'Dorian',        pattern: [0,2,3,5,7,9,10] },
  phrygian:     { label: 'Phrygian',      pattern: [0,1,3,5,7,8,10] },
  lydian:       { label: 'Lydian',        pattern: [0,2,4,6,7,9,11] },
  mixolydian:   { label: 'Mixolydian',    pattern: [0,2,4,5,7,9,10] },
  harmonicMin:  { label: 'Harmonic Min',  pattern: [0,2,3,5,7,8,11] },
};

// Keys with their preferred accidental spelling
const KEYS = [
  { i: 0,  name: 'C',  flat: false },
  { i: 1,  name: 'Db', flat: true  },
  { i: 2,  name: 'D',  flat: false },
  { i: 3,  name: 'Eb', flat: true  },
  { i: 4,  name: 'E',  flat: false },
  { i: 5,  name: 'F',  flat: true  },
  { i: 6,  name: 'F#', flat: false },
  { i: 7,  name: 'G',  flat: false },
  { i: 8,  name: 'Ab', flat: true  },
  { i: 9,  name: 'A',  flat: false },
  { i: 10, name: 'Bb', flat: true  },
  { i: 11, name: 'B',  flat: false },
];

function noteName(semitone, flat=false) {
  const arr = flat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return arr[((semitone % 12) + 12) % 12];
}

// Given key (0-11 root), mode pattern, returns 7 scale-note pitch classes
function scaleNotes(rootPc, pattern) {
  return pattern.map(iv => (rootPc + iv) % 12);
}

// Triad quality from three pitch classes (root, third, fifth) - returns
// 'maj' | 'min' | 'dim' | 'aug'
function triadQuality(root, third, fifth) {
  const a = ((third - root) + 12) % 12;
  const b = ((fifth - root) + 12) % 12;
  if (a === 4 && b === 7) return 'maj';
  if (a === 3 && b === 7) return 'min';
  if (a === 3 && b === 6) return 'dim';
  if (a === 4 && b === 8) return 'aug';
  return 'maj';
}

// Seventh interval (from root, in semitones) using diatonic 7th: scaleNotes[(deg+6)%7]
function seventhInterval(root, seventh) {
  return ((seventh - root) + 12) % 12;
}

// Build full chord info for one diatonic degree.
// `extension` can be one of: 'triad' | '7' | '9' | '11' | '13'  (default 'triad')
function diatonicChord(keyPc, pattern, degree, opts = {}) {
  const { useFlats = false, extension = 'triad' } = opts;
  const sc = scaleNotes(keyPc, pattern);
  const root    = sc[degree % 7];
  const third   = sc[(degree + 2) % 7];
  const fifth   = sc[(degree + 4) % 7];
  const seventh = sc[(degree + 6) % 7];
  const ninth   = sc[(degree + 1) % 7]; // 9th = 2nd up an octave
  const eleventh= sc[(degree + 3) % 7]; // 11th = 4th up an octave
  const thirteenth = sc[(degree + 5) % 7]; // 13th = 6th up an octave
  const q = triadQuality(root, third, fifth);
  const sev = seventhInterval(root, seventh); // 10 = min7, 11 = maj7, 9 = dim7

  // Build the base 7th suffix (used as foundation for 9/11/13 too)
  let base7 = '';
  if (q === 'maj' && sev === 11) base7 = 'maj7';
  else if (q === 'maj' && sev === 10) base7 = '7';
  else if (q === 'min' && sev === 10) base7 = 'm7';
  else if (q === 'min' && sev === 11) base7 = 'mMaj7';
  else if (q === 'dim' && sev === 10) base7 = 'ø7';
  else if (q === 'dim' && sev === 9)  base7 = '°7';
  else if (q === 'aug') base7 = '+maj7';

  let suffix = '';
  if (extension === 'triad') {
    if (q === 'maj') suffix = '';
    else if (q === 'min') suffix = 'm';
    else if (q === 'dim') suffix = '°';
    else if (q === 'aug') suffix = '+';
  } else if (extension === '7') {
    suffix = base7;
  } else {
    // 9 / 11 / 13: replace the trailing 7 in base7 with the higher number
    // e.g. maj7 -> maj9, m7 -> m9, 7 -> 9, ø7 -> ø9
    suffix = base7.replace(/7$/, extension);
  }

  // Roman numeral
  const romans = ['I','II','III','IV','V','VI','VII'];
  let rn = romans[degree];
  if (q === 'min' || q === 'dim') rn = rn.toLowerCase();
  if (q === 'dim') rn += '°';
  if (q === 'aug') rn += '+';
  if (extension !== 'triad') {
    // Strip leading 'm' / 'maj' notation that already appears in roman case
    // and append the extension number, with 'maj' marker for major-7th quality
    if (base7.startsWith('maj')) rn += 'M' + extension; // IM7, IM9 …
    else if (base7.startsWith('mMaj')) rn += 'M' + extension;
    else rn += extension;
  }

  // Voicing: stack root, third, fifth, then 7/9/11/13 ascending from octave 4
  const baseOct = 4;
  const built = [];
  let prev = -Infinity;
  const stack = (pc) => {
    let m = 12 * (baseOct + 1) + pc;
    while (m <= prev) m += 12;
    built.push(m);
    prev = m;
  };
  [root, third, fifth].forEach(stack);
  if (extension === '7' || extension === '9' || extension === '11' || extension === '13') {
    stack(seventh);
  }
  if (extension === '9' || extension === '11' || extension === '13') {
    stack(ninth);
  }
  if (extension === '11') {
    stack(eleventh);
  }
  if (extension === '13') {
    stack(thirteenth);
  }

  return {
    degree,
    root,
    quality: q,
    name: noteName(root, useFlats) + suffix,
    roman: rn,
    midi: built,
    notes: built.map(midiToNoteString),
  };
}

function midiToNoteString(m) {
  const oct = Math.floor(m / 12) - 1;
  const pc = ((m % 12) + 12) % 12;
  return NOTE_NAMES_SHARP[pc] + oct;
}

// Common progression "skeletons" with weights reflecting frequency-of-use in popular songs.
// Weight ~= relative likelihood. Higher = more common.
// Source intuition: hooktheory / popular-music corpus analyses.
const SKELETONS = {
  major: [
    // The Big Four "axis" rotations — by far the most common in pop
    { deg: [0,4,5,3], weight: 30, name: 'I-V-vi-IV' },        // "Don't Stop Believin'", "Let It Be"
    { deg: [5,3,0,4], weight: 22, name: 'vi-IV-I-V' },        // "Zombie", "Numb"
    { deg: [0,5,3,4], weight: 18, name: 'I-vi-IV-V' },        // 50s doo-wop
    { deg: [3,4,5,5], weight: 6,  name: 'IV-V-vi-vi' },
    // Three-chord rock/folk staples
    { deg: [0,3,4],   weight: 14, name: 'I-IV-V' },
    { deg: [0,4,3],   weight: 10, name: 'I-V-IV' },
    { deg: [0,5,3],   weight: 8,  name: 'I-vi-IV' },
    { deg: [0,3,0,4], weight: 8,  name: 'I-IV-I-V' },
    // Two-chord vamps
    { deg: [0,4],     weight: 5,  name: 'I-V' },
    { deg: [0,3],     weight: 4,  name: 'I-IV' },
    { deg: [0,5],     weight: 4,  name: 'I-vi' },
    // Jazz/sophisticated
    { deg: [1,4,0],   weight: 6,  name: 'ii-V-I' },
    { deg: [0,1,4,0], weight: 4,  name: 'I-ii-V-I' },
    { deg: [0,5,1,4], weight: 4,  name: 'I-vi-ii-V' },
    // Longer / descending
    { deg: [0,4,5,3,2,1,3,4], weight: 3, name: 'I-V-vi-IV-iii-ii-IV-V' },
    { deg: [0,2,3,4],         weight: 3, name: 'I-iii-IV-V' },
    { deg: [0,4,5,3,0,4,3,4], weight: 2, name: 'extended axis' },
    // Modal/passing
    { deg: [0,2,5,3], weight: 2, name: 'I-iii-vi-IV' },
    { deg: [3,5,0,4], weight: 2, name: 'IV-vi-I-V' },
  ],
  minor: [
    // Minor key staples — i-VI-III-VII is the "Africa"/"Demons" axis
    { deg: [0,5,2,6], weight: 22, name: 'i-VI-III-VII' },
    { deg: [0,6,2,5], weight: 16, name: 'i-VII-III-VI' },
    { deg: [0,5,6,4], weight: 14, name: 'i-VI-VII-v' },
    { deg: [0,3,4,0], weight: 12, name: 'i-iv-v-i' },
    { deg: [0,5,3,4], weight: 10, name: 'i-VI-iv-v' },
    { deg: [0,6,3,4], weight: 8,  name: 'i-VII-iv-v' },
    { deg: [0,3,4],   weight: 10, name: 'i-iv-v' },
    { deg: [0,6,4],   weight: 7,  name: 'i-VII-v' },
    { deg: [0,5,3],   weight: 6,  name: 'i-VI-iv' },
    { deg: [0,4],     weight: 4,  name: 'i-v' },
    { deg: [0,3],     weight: 4,  name: 'i-iv' },
    { deg: [0,6],     weight: 5,  name: 'i-VII' },
    { deg: [0,3,6,4], weight: 5,  name: 'i-iv-VII-v' },
    { deg: [1,4,0],   weight: 5,  name: 'ii°-v-i' },
    { deg: [0,5,6,4,3,5,6,4], weight: 2, name: 'extended minor axis' },
  ],
};

function weightedPick(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function pickProgression(modeKey, length) {
  const family = ['minor','phrygian','harmonicMin'].includes(modeKey) ? SKELETONS.minor : SKELETONS.major;
  // Prefer exact-length matches when available
  const exact = family.filter(p => p.deg.length === length);
  if (exact.length) {
    return weightedPick(exact).deg.slice();
  }
  // Otherwise pick a weighted base and stretch/truncate
  const base = weightedPick(family).deg.slice();
  while (base.length < length) {
    // Insert a smooth-voice-leading passing chord
    const passing = [1, 2, 3, 5][Math.floor(Math.random() * 4)];
    base.splice(Math.floor(Math.random() * base.length) + 1, 0, passing);
  }
  while (base.length > length) {
    base.splice(Math.floor(Math.random() * (base.length - 1)) + 1, 1);
  }
  return base;
}

function generateProgression(keyPc, modeKey, length, opts={}) {
  const pattern = MODES[modeKey].pattern;
  const degrees = pickProgression(modeKey, length);
  const keyInfo = KEYS.find(k => k.i === keyPc);
  const useFlats = keyInfo ? keyInfo.flat : false;
  return degrees.map(d => diatonicChord(keyPc, pattern, d, { useFlats, extension: opts.extension || 'triad' }));
}

// ───────────────────────────────────────────────────────────────────
// Audio: Tone.js synth presets
// ───────────────────────────────────────────────────────────────────

const SOUNDS = {
  piano: {
    label: 'Piano',
    build: () => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 1.4 },
        volume: -10,
      });
      const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 });
      synth.connect(reverb); reverb.toDestination();
      return { synth, fx: [reverb] };
    },
  },
  rhodes: {
    label: 'Rhodes',
    build: () => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.0,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 1.2, sustain: 0.2, release: 1.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.01, decay: 0.7, sustain: 0, release: 0.4 },
        volume: -14,
      });
      const chorus = new Tone.Chorus(2.5, 1.6, 0.4).start();
      const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 });
      synth.connect(chorus); chorus.connect(reverb); reverb.toDestination();
      return { synth, fx: [chorus, reverb] };
    },
  },
  pad: {
    label: 'Pad',
    build: () => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.6, decay: 1.0, sustain: 0.8, release: 2.5 },
        volume: -16,
      });
      const filter = new Tone.Filter(1200, 'lowpass');
      const reverb = new Tone.Reverb({ decay: 5, wet: 0.55 });
      synth.connect(filter); filter.connect(reverb); reverb.toDestination();
      return { synth, fx: [filter, reverb] };
    },
  },
  pluck: {
    label: 'Pluck',
    build: () => {
      const synth = new Tone.PolySynth(Tone.PluckSynth, {
        attackNoise: 0.5,
        dampening: 4000,
        resonance: 0.85,
        volume: -6,
      });
      const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.25 });
      synth.connect(reverb); reverb.toDestination();
      return { synth, fx: [reverb] };
    },
  },
  organ: {
    label: 'Organ',
    build: () => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 12 },
        envelope: { attack: 0.04, decay: 0.0, sustain: 1.0, release: 0.25 },
        volume: -16,
      });
      const filter = new Tone.Filter(2200, 'lowpass');
      const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.2 });
      synth.connect(filter); filter.connect(reverb); reverb.toDestination();
      return { synth, fx: [filter, reverb] };
    },
  },
};

class AudioEngine {
  constructor() {
    this.preset = null;
    this.instance = null;
    this.playing = false;
    this.activeIndex = -1;
    this.scheduled = [];
    this.metroSynth = null;
    this.metroOn = false;
    this.endId = null;
    this.beatsPerChord = 1;
    this.totalBeats = 0;
    this.onStep = null;
    this.onStop = null;
    this.onBeat = null;
  }
  async ensure(presetKey) {
    await Tone.start();
    if (this.preset !== presetKey) {
      const oldInstance = this.instance;
      this.instance = SOUNDS[presetKey].build();
      this.preset = presetKey;
      if (oldInstance) {
        try { oldInstance.synth.releaseAll(); } catch(e){}
        setTimeout(() => {
          try { oldInstance.synth.dispose(); } catch(e){}
          oldInstance.fx.forEach(n => { try { n.dispose(); } catch(e){} });
        }, 100);
      }
    }
  }
  dispose() {
    if (this.instance) {
      try { this.instance.synth.releaseAll(); } catch(e){}
      try { this.instance.synth.dispose(); } catch(e){}
      this.instance.fx.forEach(n => { try { n.dispose(); } catch(e){} });
      this.instance = null;
    }
    if (this.metroSynth) {
      try { this.metroSynth.dispose(); } catch(e){}
      this.metroSynth = null;
    }
    if (this.metroFilter) {
      try { this.metroFilter.dispose(); } catch(e){}
      this.metroFilter = null;
    }
  }
  stop() {
    this.playing = false;
    this.scheduled.forEach(id => Tone.Transport.clear(id));
    this.scheduled = [];
    if (this.endId !== null) { Tone.Transport.clear(this.endId); this.endId = null; }
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.loop = false;
    if (this.instance) { try { this.instance.synth.releaseAll(); } catch(e){} }
    this.activeIndex = -1;
    if (this.onStep) this.onStep(-1);
    if (this.onStop) this.onStop();
  }
  setBpm(bpm) {
    Tone.Transport.bpm.rampTo(bpm, 0.05);
  }
  setLoop(on) {
    Tone.Transport.loop = on;
    if (!this.playing) return;
    if (on) {
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = `0:${this.totalBeats}:0`;
      if (this.endId !== null) { Tone.Transport.clear(this.endId); this.endId = null; }
    } else if (this.endId === null) {
      // schedule stop at end of current pass
      const pos = Tone.Transport.position;
      const parts = pos.split(':').map(Number);
      const currentBeats = parts[0] * 4 + parts[1] + (parts[2] || 0) / 4;
      const nextEndBeats = Math.ceil((currentBeats + 0.001) / this.totalBeats) * this.totalBeats;
      this.endId = Tone.Transport.scheduleOnce((time) => {
        Tone.Draw.schedule(() => { this.stop(); }, time);
      }, `0:${nextEndBeats}:0`);
    }
  }
  _ensureMetro() {
    if (this.metroSynth && !this.metroSynth.disposed) return;
    // MembraneSynth: pitched, percussive — very audible against pad/piano chords.
    this.metroSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.0006, decay: 0.18, sustain: 0, release: 0.05 },
      volume: 0,
    }).toDestination();
    this.metroFilter = null;
  }
  // Toggle the metronome flag. The chord scheduler callback reads this flag
  // at trigger time, so toggling mid-playback takes effect at the very next beat.
  setMetronome(on) {
    this.metroOn = !!on;
    if (on) this._ensureMetro();
  }

  swapProgression(progression) {
    if (!this.playing) return;
    this.scheduled.forEach(id => Tone.Transport.clear(id));
    this.scheduled = [];
    if (this.endId !== null) { Tone.Transport.clear(this.endId); this.endId = null; }
    try { this.instance.synth.releaseAll(); } catch(e) {}

    const beatsPerChord = this.beatsPerChord;
    const totalBeats = progression.length * beatsPerChord;
    this.totalBeats = totalBeats;

    Tone.Transport.position = 0;

    progression.forEach((chord, i) => {
      const beatPos = i * beatsPerChord;
      const id = Tone.Transport.schedule((time) => {
        if (!this.playing) return;
        const dur = (60 / Tone.Transport.bpm.value) * beatsPerChord * 0.95;
        try { this.instance.synth.triggerAttackRelease(chord.notes, dur, time); } catch(e) {}
        if (this.metroOn && this.metroSynth && !this.metroSynth.disposed) {
          try {
            const accent = i === 0;
            this.metroSynth.triggerAttackRelease(accent ? 'C5' : 'A4', '32n', time, accent ? 1.0 : 0.7);
          } catch(e) {}
        }
        Tone.Draw.schedule(() => {
          this.activeIndex = i;
          if (this.onStep) this.onStep(i);
          if (this.onBeat) this.onBeat();
        }, time);
      }, `0:${beatPos}:0`);
      this.scheduled.push(id);
    });

    if (Tone.Transport.loop) {
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = `0:${totalBeats}:0`;
    } else {
      this.endId = Tone.Transport.scheduleOnce((time) => {
        Tone.Draw.schedule(() => { this.stop(); }, time);
      }, `0:${totalBeats}:0`);
    }
  }
  async playProgression(progression, bpm = 80, presetKey = 'piano', opts = {}) {
    const { loop = false, metronome = false } = opts;
    await this.ensure(presetKey);
    this._ensureMetro();
    this.stop();
    this.metroOn = !!metronome;
    Tone.Transport.bpm.value = bpm;
    this.playing = true;
    const beatsPerChord = 1;
    this.beatsPerChord = beatsPerChord;
    const totalBeats = progression.length * beatsPerChord;
    this.totalBeats = totalBeats;

    progression.forEach((chord, i) => {
      const beatPos = i * beatsPerChord;
      const id = Tone.Transport.schedule((time) => {
        if (!this.playing) return;
        const dur = (60 / Tone.Transport.bpm.value) * beatsPerChord * 0.95;
        // Play the chord
        try { this.instance.synth.triggerAttackRelease(chord.notes, dur, time); } catch(e) {}
        // Metronome tick — same time, same path as the chord. Diagnostics counters.
        this.metroDebug = this.metroDebug || { attempts: 0, fired: 0, lastErr: null, lastMetroOn: false };
        this.metroDebug.lastMetroOn = this.metroOn;
        if (this.metroOn) {
          this.metroDebug.attempts++;
          if (this.metroSynth && !this.metroSynth.disposed) {
            try {
              const accent = i === 0;
              this.metroSynth.triggerAttackRelease(accent ? 'C5' : 'A4', '32n', time, accent ? 1.0 : 0.7);
              this.metroDebug.fired++;
            } catch(e) { this.metroDebug.lastErr = e.message || String(e); }
          }
        }
        Tone.Draw.schedule(() => {
          this.activeIndex = i;
          if (this.onStep) this.onStep(i);
          if (this.onBeat) this.onBeat();
        }, time);
      }, `0:${beatPos}:0`);
      this.scheduled.push(id);
    });

    if (loop) {
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = `0:${totalBeats}:0`;
    } else {
      Tone.Transport.loop = false;
      this.endId = Tone.Transport.scheduleOnce((time) => {
        Tone.Draw.schedule(() => { this.stop(); }, time);
      }, `0:${totalBeats}:0`);
    }
    Tone.Transport.start();
  }
  async playOne(chord, presetKey='piano', durationSec = 0.9) {
    await this.ensure(presetKey);
    try { this.instance.synth.triggerAttackRelease(chord.notes, durationSec); } catch(e){}
  }
}

Object.assign(window, {
  NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, MODES, KEYS,
  diatonicChord, generateProgression, AudioEngine, SOUNDS,
});
