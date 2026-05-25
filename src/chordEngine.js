import * as Tone from 'tone';

// ─── Music theory ──────────────────────────────────────────────────────────

const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

export const MODES = {
  major:       { label: 'Major',        pattern: [0,2,4,5,7,9,11] },
  minor:       { label: 'Minor',        pattern: [0,2,3,5,7,8,10] },
  dorian:      { label: 'Dorian',       pattern: [0,2,3,5,7,9,10] },
  phrygian:    { label: 'Phrygian',     pattern: [0,1,3,5,7,8,10] },
  lydian:      { label: 'Lydian',       pattern: [0,2,4,6,7,9,11] },
  mixolydian:  { label: 'Mixolydian',   pattern: [0,2,4,5,7,9,10] },
  harmonicMin: { label: 'Harmonic Min', pattern: [0,2,3,5,7,8,11] },
};

export const KEYS = [
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

function noteName(semitone, flat = false) {
  const arr = flat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return arr[((semitone % 12) + 12) % 12];
}

function scaleNotes(rootPc, pattern) {
  return pattern.map(iv => (rootPc + iv) % 12);
}

function triadQuality(root, third, fifth) {
  const a = ((third - root) + 12) % 12;
  const b = ((fifth - root) + 12) % 12;
  if (a === 4 && b === 7) return 'maj';
  if (a === 3 && b === 7) return 'min';
  if (a === 3 && b === 6) return 'dim';
  if (a === 4 && b === 8) return 'aug';
  return 'maj';
}

function seventhInterval(root, seventh) {
  return ((seventh - root) + 12) % 12;
}

export function diatonicChord(keyPc, pattern, degree, opts = {}) {
  const { useFlats = false, extension = 'triad' } = opts;
  const sc = scaleNotes(keyPc, pattern);
  const root      = sc[degree % 7];
  const third     = sc[(degree + 2) % 7];
  const fifth     = sc[(degree + 4) % 7];
  const seventh   = sc[(degree + 6) % 7];
  const ninth     = sc[(degree + 1) % 7];
  const eleventh  = sc[(degree + 3) % 7];
  const thirteenth= sc[(degree + 5) % 7];
  const q = triadQuality(root, third, fifth);
  const sev = seventhInterval(root, seventh);

  let base7 = '';
  if      (q === 'maj' && sev === 11) base7 = 'maj7';
  else if (q === 'maj' && sev === 10) base7 = '7';
  else if (q === 'min' && sev === 10) base7 = 'm7';
  else if (q === 'min' && sev === 11) base7 = 'mMaj7';
  else if (q === 'dim' && sev === 10) base7 = 'ø7';
  else if (q === 'dim' && sev === 9)  base7 = '°7';
  else if (q === 'aug')               base7 = '+maj7';

  let suffix = '';
  if (extension === 'triad') {
    if      (q === 'maj') suffix = '';
    else if (q === 'min') suffix = 'm';
    else if (q === 'dim') suffix = '°';
    else if (q === 'aug') suffix = '+';
  } else if (extension === '7') {
    suffix = base7;
  } else {
    suffix = base7.replace(/7$/, extension);
  }

  const romans = ['I','II','III','IV','V','VI','VII'];
  let rn = romans[degree];
  if (q === 'min' || q === 'dim') rn = rn.toLowerCase();
  if (q === 'dim') rn += '°';
  if (q === 'aug') rn += '+';
  if (extension !== 'triad') {
    if (base7.startsWith('maj') || base7.startsWith('mMaj')) rn += 'M' + extension;
    else rn += extension;
  }

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
  if (['7','9','11','13'].includes(extension)) stack(seventh);
  if (['9','11','13'].includes(extension)) stack(ninth);
  if (extension === '11') stack(eleventh);
  if (extension === '13') stack(thirteenth);

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
  const pc  = ((m % 12) + 12) % 12;
  return NOTE_NAMES_SHARP[pc] + oct;
}

// ─── Weighted progression skeletons ──────────────────────────────────────

const SKELETONS = {
  major: [
    { deg: [0,4,5,3], weight: 30, name: 'I-V-vi-IV' },
    { deg: [5,3,0,4], weight: 22, name: 'vi-IV-I-V' },
    { deg: [0,5,3,4], weight: 18, name: 'I-vi-IV-V' },
    { deg: [3,4,5,5], weight: 6,  name: 'IV-V-vi-vi' },
    { deg: [0,3,4],   weight: 14, name: 'I-IV-V' },
    { deg: [0,4,3],   weight: 10, name: 'I-V-IV' },
    { deg: [0,5,3],   weight: 8,  name: 'I-vi-IV' },
    { deg: [0,3,0,4], weight: 8,  name: 'I-IV-I-V' },
    { deg: [0,4],     weight: 5,  name: 'I-V' },
    { deg: [0,3],     weight: 4,  name: 'I-IV' },
    { deg: [0,5],     weight: 4,  name: 'I-vi' },
    { deg: [1,4,0],   weight: 6,  name: 'ii-V-I' },
    { deg: [0,1,4,0], weight: 4,  name: 'I-ii-V-I' },
    { deg: [0,5,1,4], weight: 4,  name: 'I-vi-ii-V' },
    { deg: [0,4,5,3,2,1,3,4], weight: 3, name: 'I-V-vi-IV-iii-ii-IV-V' },
    { deg: [0,2,3,4], weight: 3,  name: 'I-iii-IV-V' },
    { deg: [0,2,5,3], weight: 2,  name: 'I-iii-vi-IV' },
    { deg: [3,5,0,4], weight: 2,  name: 'IV-vi-I-V' },
  ],
  minor: [
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
  const family = ['minor','phrygian','harmonicMin'].includes(modeKey)
    ? SKELETONS.minor : SKELETONS.major;
  const exact = family.filter(p => p.deg.length === length);
  if (exact.length) return weightedPick(exact).deg.slice();
  const base = weightedPick(family).deg.slice();
  while (base.length < length) {
    const passing = [1,2,3,5][Math.floor(Math.random() * 4)];
    base.splice(Math.floor(Math.random() * base.length) + 1, 0, passing);
  }
  while (base.length > length) {
    base.splice(Math.floor(Math.random() * (base.length - 1)) + 1, 1);
  }
  return base;
}

export function generateProgression(keyPc, modeKey, length, opts = {}) {
  const pattern = MODES[modeKey].pattern;
  const degrees = pickProgression(modeKey, length);
  const keyInfo = KEYS.find(k => k.i === keyPc);
  const useFlats = keyInfo ? keyInfo.flat : false;
  return degrees.map(d => diatonicChord(keyPc, pattern, d, {
    useFlats,
    extension: opts.extension || 'triad',
  }));
}

// ─── Sound presets ────────────────────────────────────────────────────────
// Pluck removed — replaced with Wurlitzer.

export const SOUNDS = {
  piano: {
    label: 'Piano',
    build: () => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 1.4 },
        volume: -10,
      });
      const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 });
      synth.connect(reverb);
      reverb.toDestination();
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
      synth.connect(chorus);
      chorus.connect(reverb);
      reverb.toDestination();
      return { synth, fx: [chorus, reverb] };
    },
  },
  wurlitzer: {
    label: 'Wurlitzer',
    build: () => {
      // Wurlitzer 200A: metallic bell attack, slight grit, tremolo
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.5,
        modulationIndex: 3.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.008, decay: 1.0, sustain: 0.2, release: 1.3 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.05, release: 0.5 },
        volume: -12,
      });
      const tremolo = new Tone.Tremolo(4.5, 0.25).start();
      const reverb = new Tone.Reverb({ decay: 2.0, wet: 0.22 });
      synth.connect(tremolo);
      tremolo.connect(reverb);
      reverb.toDestination();
      return { synth, fx: [tremolo, reverb] };
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
      synth.connect(filter);
      filter.connect(reverb);
      reverb.toDestination();
      return { synth, fx: [filter, reverb] };
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
      synth.connect(filter);
      filter.connect(reverb);
      reverb.toDestination();
      return { synth, fx: [filter, reverb] };
    },
  },
};

// ─── Audio engine ─────────────────────────────────────────────────────────

export class AudioEngine {
  constructor() {
    this.preset = null;
    this.instance = null;
    this.playing = false;
    this.activeIndex = -1;
    this.scheduled = [];
    this.endId = null;
    this.beatsPerChord = 1;
    this.totalBeats = 0;
    this.metroOn = false;
    this.metroSynth = null;
    this.metroLoop = null;
    this._beatCount = 0;
    this.onStep = null;
    this.onStop = null;
    this.onBeat = null;
  }

  async ensure(presetKey) {
    await Tone.start();
    if (this.preset !== presetKey) {
      const old = this.instance;
      this.instance = SOUNDS[presetKey].build();
      this.preset = presetKey;
      if (old) {
        setTimeout(() => {
          try { old.synth.releaseAll(); } catch (e) {}
          try { old.synth.dispose(); } catch (e) {}
          old.fx.forEach(n => { try { n.dispose(); } catch (e) {} });
        }, 200);
      }
    }
  }

  // Metronome runs as an independent Tone.Loop, always in sync with Transport.
  // The `metroOn` flag gates sound output — toggling it takes effect on the
  // very next tick without any re-scheduling.
  _initMetro() {
    if (this.metroLoop) return;

    this.metroSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: -2,
    }).toDestination();

    this.metroLoop = new Tone.Loop((time) => {
      if (!this.metroOn || !this.metroSynth || this.metroSynth.disposed) return;
      const accent = this._beatCount % 4 === 0;
      this._beatCount = (this._beatCount + 1) % 400;
      try {
        this.metroSynth.triggerAttackRelease(
          accent ? 'C6' : 'G5',
          '64n',
          time,
          accent ? 0.9 : 0.55,
        );
      } catch (e) {}
    }, '4n');
  }

  setMetronome(on) {
    this.metroOn = !!on;
    // No re-scheduling needed — the loop reads `metroOn` at fire time
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
      const parts = Tone.Transport.position.split(':').map(Number);
      const cur = parts[0] * 4 + parts[1] + (parts[2] || 0) / 4;
      const nextEnd = Math.ceil((cur + 0.001) / this.totalBeats) * this.totalBeats;
      this.endId = Tone.Transport.scheduleOnce((time) => {
        Tone.Draw.schedule(() => { this.stop(); }, time);
      }, `0:${nextEnd}:0`);
    }
  }

  stop() {
    this.playing = false;
    this.scheduled.forEach(id => Tone.Transport.clear(id));
    this.scheduled = [];
    if (this.endId !== null) { Tone.Transport.clear(this.endId); this.endId = null; }
    if (this.metroLoop) { try { this.metroLoop.stop(0); } catch (e) {} }
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.loop = false;
    this._beatCount = 0;
    if (this.instance) { try { this.instance.synth.releaseAll(); } catch (e) {} }
    this.activeIndex = -1;
    if (this.onStep) this.onStep(-1);
    if (this.onStop) this.onStop();
  }

  _scheduleProgression(progression, loop) {
    this.totalBeats = progression.length * this.beatsPerChord;

    progression.forEach((chord, i) => {
      const beatPos = i * this.beatsPerChord;
      const id = Tone.Transport.schedule((time) => {
        if (!this.playing) return;
        const dur = (60 / Tone.Transport.bpm.value) * this.beatsPerChord * 0.92;
        try { this.instance.synth.triggerAttackRelease(chord.notes, dur, time); } catch (e) {}
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
      Tone.Transport.loopEnd = `0:${this.totalBeats}:0`;
    } else {
      Tone.Transport.loop = false;
      this.endId = Tone.Transport.scheduleOnce((time) => {
        Tone.Draw.schedule(() => { this.stop(); }, time);
      }, `0:${this.totalBeats}:0`);
    }
  }

  // Swap progression mid-playback without stopping the Transport
  swapProgression(progression) {
    if (!this.playing) return;
    this.scheduled.forEach(id => Tone.Transport.clear(id));
    this.scheduled = [];
    if (this.endId !== null) { Tone.Transport.clear(this.endId); this.endId = null; }
    try { this.instance.synth.releaseAll(); } catch (e) {}

    this.beatsPerChord = 1;
    Tone.Transport.position = 0;
    this._scheduleProgression(progression, Tone.Transport.loop);
  }

  async playProgression(progression, bpm = 80, presetKey = 'piano', opts = {}) {
    const { loop = false } = opts;
    await this.ensure(presetKey);
    this._initMetro();
    this.stop();

    Tone.Transport.bpm.value = bpm;
    this.playing = true;
    this.beatsPerChord = 1;
    this._beatCount = 0;

    this._scheduleProgression(progression, loop);

    // Start the metronome loop at Transport position 0 so it's always in sync
    this.metroLoop.start(0);
    Tone.Transport.start();
  }

  async playOne(chord, presetKey = 'piano', durationSec = 0.9) {
    await this.ensure(presetKey);
    try { this.instance.synth.triggerAttackRelease(chord.notes, durationSec); } catch (e) {}
  }

  dispose() {
    if (this.metroLoop) { try { this.metroLoop.stop(0); this.metroLoop.dispose(); } catch (e) {} this.metroLoop = null; }
    if (this.metroSynth) { try { this.metroSynth.dispose(); } catch (e) {} this.metroSynth = null; }
    if (this.instance) {
      try { this.instance.synth.releaseAll(); } catch (e) {}
      try { this.instance.synth.dispose(); } catch (e) {}
      this.instance.fx.forEach(n => { try { n.dispose(); } catch (e) {} });
      this.instance = null;
    }
  }
}
