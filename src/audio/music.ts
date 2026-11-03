// Música generativa: se compone en vivo sobre la escala miyako-bushi, así nunca se repite igual.
//  - calma: menú y pausas. Koto lento, colchón grave y shakuhachi ocasional.
//  - batalla: durante el juego. Taiko + riff de shamisen; se acelera con cada oleada.
import { getEngine, setBusVolume, type Engine } from './engine';
import { drum, flute, noise, pad, pluck, scaleNote } from './synth';

export type Mood = 'calma' | 'batalla';

const LOOKAHEAD = 0.25;

// Riffs de shamisen (pasos de la escala por corchea; null = silencio).
const RIFFS: (number | null)[][] = [
  [0, 0, 2, 0, 3, 2, 0, -1],
  [0, 2, 3, 4, 3, 2, 0, 2],
  [-1, 0, 2, null, -1, 0, 3, 2],
  [0, null, 0, 2, 4, 3, 2, null],
];

let enabled = true;
let unlocked = false;
let mood: Mood | null = null;
let intensity = 1;
let timer: number | null = null;
let nextTime = 0;
let step = 0;
let stopPad: ((fade?: number) => void) | null = null;
let melody = 5;
let riff = RIFFS[0];

/** El navegador solo deja sonar audio después de una interacción del usuario. */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  restart();
}

/** 0 apaga la música por completo (deja de componer). */
export function setMusicVolume(value: number) {
  setBusVolume('music', value);
  const on = value > 0;
  if (enabled === on) return;
  enabled = on;
  restart();
}

export function playMusic(next: Mood) {
  if (mood === next) return;
  mood = next;
  restart();
}

/** Nivel de intensidad de la batalla (la oleada actual). */
export function setMusicIntensity(level: number) {
  intensity = level;
}

function stop() {
  stopPad?.();
  stopPad = null;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function restart() {
  stop();
  if (!enabled || !unlocked || !mood) return;
  const e = getEngine();
  if (!e) return;
  const root = scaleNote(-10); // re2
  stopPad = mood === 'calma'
    ? pad(e, e.music, [root, root * 1.5, root * 2], 0.07)
    : pad(e, e.music, [root, root * 1.5], 0.05);
  step = 0;
  nextTime = e.ac.currentTime + 0.1;
  timer = window.setInterval(schedule, 60);
}

function sixteenth(): number {
  const bpm = mood === 'calma' ? 66 : Math.min(132, 92 + intensity * 4);
  return 60 / bpm / 4;
}

function schedule() {
  const e = getEngine();
  if (!e) return;
  // Si la pestaña estuvo en segundo plano, no intentamos "ponernos al día".
  if (nextTime < e.ac.currentTime - 0.5) nextTime = e.ac.currentTime + 0.05;
  while (nextTime < e.ac.currentTime + LOOKAHEAD) {
    if (mood === 'calma') calmStep(e, nextTime, step);
    else battleStep(e, nextTime, step);
    nextTime += sixteenth();
    step++;
  }
}

function walkMelody(min: number, max: number): number {
  melody = Math.max(min, Math.min(max, melody + Math.floor(Math.random() * 5) - 2));
  return melody;
}

function calmStep(e: Engine, t: number, s: number) {
  const out = e.music;
  if (s % 2 !== 0) return;
  // Koto: notas sueltas con silencios, a veces una quinta abajo como acompañamiento.
  if (Math.random() < (s % 16 === 0 ? 0.9 : 0.35)) {
    pluck(e, out, t, scaleNote(walkMelody(2, 11)), { vol: 0.14, dur: 2.2, bright: 3000 });
  }
  if (s % 32 === 0) pluck(e, out, t, scaleNote(-5), { vol: 0.12, dur: 3, bright: 1500 });
  if (s % 64 === 32 && Math.random() < 0.6) {
    flute(e, out, t, scaleNote(5 + [0, 2, 3, 4][Math.floor(Math.random() * 4)]), { dur: 3.5, vol: 0.06 });
  }
}

function battleStep(e: Engine, t: number, s: number) {
  const out = e.music;
  const pos = s % 16;
  if (pos === 0 && (s / 16) % 2 === 0) riff = RIFFS[Math.floor(Math.random() * RIFFS.length)];

  // Taiko
  if (pos === 0 || pos === 8) drum(e, out, t, 72, { vol: 0.45, dur: 0.5 });
  if (pos === 10 && intensity >= 3) drum(e, out, t, 72, { vol: 0.3, dur: 0.4 });
  if (pos === 14 && intensity >= 6) drum(e, out, t, 90, { vol: 0.25, dur: 0.3 });
  // "Ka": golpe en el borde del tambor
  if (pos === 4 || pos === 12) noise(e, out, t, { dur: 0.05, vol: 0.12, freq: 2500, q: 4 });

  // Shamisen: el riff en corcheas
  if (pos % 2 === 0) {
    const note = riff[pos / 2];
    if (note !== null) pluck(e, out, t, scaleNote(note - 5), { vol: 0.09, dur: 0.35, bright: 6000 });
  }

  // Koto: una nota larga de vez en cuando
  if (pos === 0 && Math.random() < 0.5) {
    pluck(e, out, t, scaleNote(walkMelody(5, 12)), { vol: 0.08, dur: 1.6, bright: 3500 });
  }
}
