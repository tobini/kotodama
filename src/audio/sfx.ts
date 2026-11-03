// Efectos de sonido sintetizados: no hace falta ningún archivo.
import { busVolume, getEngine, setBusVolume, type Engine } from './engine';
import { drum, noise, pluck, scaleNote } from './synth';

export function setSfxVolume(value: number) {
  setBusVolume('sfx', value);
}

function play(fn: (e: Engine, out: AudioNode, t: number) => void) {
  if (busVolume('sfx') <= 0) return;
  const e = getEngine();
  if (e) fn(e, e.sfx, e.ac.currentTime);
}

export const sfx = {
  /** Tecla correcta: un roce de papel muy suave. */
  key() {
    play((e, out, t) => noise(e, out, t, { dur: 0.035, vol: 0.12, freq: 3500, q: 2 }));
  },

  error() {
    play(({ ac }, out, t) => {
      const osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(filter).connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  },

  /** Yōkai desterrado: la nota sube con el combo. */
  banish(combo: number) {
    play((e, out, t) => {
      const step = 5 + (combo % 10);
      pluck(e, out, t, scaleNote(step), { vol: 0.32 });
      pluck(e, out, t + 0.06, scaleNote(step + 2), { vol: 0.18 });
      noise(e, out, t, { dur: 0.18, vol: 0.08, freq: 1800, q: 0.7 });
    });
  },

  /** Un yōkai alcanzó el santuario: golpe grave tipo gong. */
  breach() {
    play((e, out, t) => {
      drum(e, out, t, 80, { vol: 0.9, dur: 0.9 });
      pluck(e, out, t, scaleNote(-5), { dur: 1.6, vol: 0.3 });
      pluck(e, out, t + 0.02, scaleNote(-4), { dur: 1.6, vol: 0.2 });
    });
  },

  /** Inicio de oleada: taiko. */
  waveStart() {
    play((e, out, t) => {
      drum(e, out, t, 110, { vol: 0.7 });
      drum(e, out, t + 0.22, 110, { vol: 0.5 });
      drum(e, out, t + 0.5, 90, { vol: 0.9, dur: 0.6 });
    });
  },

  waveClear() {
    play((e, out, t) => {
      [0, 1, 2, 3, 4, 5].forEach((s, i) => pluck(e, out, t + i * 0.09, scaleNote(5 + s), { vol: 0.25 }));
    });
  },

  victory() {
    play((e, out, t) => {
      [0, 2, 4, 5, 7, 9, 10].forEach((s, i) => pluck(e, out, t + i * 0.12, scaleNote(5 + s), { vol: 0.3, dur: 1.4 }));
      drum(e, out, t + 0.85, 110, { vol: 0.8 });
    });
  },

  /** Se rompe una capa de un oni o del jefe: golpe metálico corto. */
  layer() {
    play((e, out, t) => {
      drum(e, out, t, 160, { vol: 0.5, dur: 0.25 });
      pluck(e, out, t, scaleNote(10), { vol: 0.2, dur: 0.6, bright: 8000 });
    });
  },

  /** El kamikaze está listo para usarse. */
  ready() {
    play((e, out, t) => {
      [5, 7, 9].forEach((s, i) => pluck(e, out, t + i * 0.07, scaleNote(s), { vol: 0.2, dur: 0.8 }));
    });
  },

  /** Kamikaze: ráfaga de viento + taiko. */
  kamikaze() {
    play((e, out, t) => {
      const { ac } = e;
      const src = ac.createBufferSource();
      src.buffer = e.noise;
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(3000, t + 0.5);
      filter.frequency.exponentialRampToValueAtTime(400, t + 1.4);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.6, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      src.connect(filter).connect(gain).connect(out);
      src.start(t, 0, 1.6);
      drum(e, out, t, 90, { vol: 1, dur: 0.7 });
      drum(e, out, t + 0.18, 70, { vol: 0.9, dur: 0.9 });
    });
  },

  gameOver() {
    play((e, out, t) => {
      [4, 3, 2, 1, 0].forEach((s, i) => pluck(e, out, t + i * 0.22, scaleNote(s), { vol: 0.3, dur: 1.5 }));
      drum(e, out, t + 1.1, 70, { vol: 0.9, dur: 1.2 });
    });
  },
};
