import { NOISE_SECONDS, type Engine } from './engine';

// Escala miyako-bushi (re, mi♭, sol, la, si♭), típica de la música tradicional japonesa.
const SCALE = [293.66, 311.13, 392.0, 440.0, 466.16];

/** Nota de la escala: 0 = re4, 5 = re5, -5 = re3... */
export function scaleNote(step: number): number {
  const octave = Math.floor(step / SCALE.length);
  return SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length] * 2 ** octave;
}

/** Nota pulsada tipo koto/shamisen: triángulo con armónicos y filtro que se cierra. */
export function pluck(
  e: Engine, dest: AudioNode, t: number, freq: number,
  { dur = 0.9, vol = 0.35, bright = 5000 } = {},
) {
  const { ac } = e;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(bright, t);
  filter.frequency.exponentialRampToValueAtTime(600, t + dur);
  filter.connect(gain).connect(dest);
  for (const [mult, type, level] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3.01, 'sine', 0.12]] as const) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    const g = ac.createGain();
    g.gain.value = level;
    osc.connect(g).connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

export function noise(
  e: Engine, dest: AudioNode, t: number,
  { dur = 0.1, vol = 0.2, freq = 2000, q = 1, type = 'bandpass' as BiquadFilterType } = {},
) {
  const { ac } = e;
  const src = ac.createBufferSource();
  src.buffer = e.noise;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(dest);
  src.start(t, Math.random() * Math.max(0, NOISE_SECONDS - dur - 0.1), dur + 0.05);
}

/** Tambor grave tipo taiko: seno con caída de afinación más un golpe de ruido. */
export function drum(e: Engine, dest: AudioNode, t: number, freq: number, { vol = 0.8, dur = 0.45 } = {}) {
  const { ac } = e;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  noise(e, dest, t, { dur: 0.08, vol: vol * 0.3, freq: 300, type: 'lowpass' });
}

/** Nota soplada tipo shakuhachi: seno con vibrato, ligera subida inicial y aire. */
export function flute(e: Engine, dest: AudioNode, t: number, freq: number, { dur = 2.5, vol = 0.08 } = {}) {
  const { ac } = e;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 0.94, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.25);
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 5;
  const depth = ac.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.012, t + dur * 0.6);
  vibrato.connect(depth).connect(osc.frequency);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.35);
  gain.gain.setValueAtTime(vol, t + dur * 0.7);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(gain).connect(dest);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + dur + 0.05);
  vibrato.stop(t + dur + 0.05);
  noise(e, dest, t, { dur: dur * 0.8, vol: vol * 0.25, freq: freq * 2, q: 3 });
}

/** Colchón sostenido (drone). Devuelve una función para apagarlo con fundido. */
export function pad(e: Engine, dest: AudioNode, freqs: number[], vol: number): (fade?: number) => void {
  const { ac } = e;
  const t = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 3);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  filter.connect(gain).connect(dest);
  // Respiración lenta del volumen
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = vol * 0.35;
  lfo.connect(lfoDepth).connect(gain.gain);
  lfo.start(t);
  const oscs = freqs.map((f, i) => {
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    osc.detune.value = i % 2 ? 4 : -4;
    osc.connect(filter);
    osc.start(t);
    return osc;
  });
  return (fade = 1.5) => {
    const now = ac.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fade);
    for (const o of [...oscs, lfo]) o.stop(now + fade + 0.1);
  };
}
