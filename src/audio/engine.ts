// Contexto de audio compartido por efectos y música, con un bus de volumen para cada uno.

export interface Engine {
  ac: AudioContext;
  sfx: GainNode;
  music: GainNode;
  /** Ruido blanco precalculado, reutilizado por todos los sonidos de ruido. */
  noise: AudioBuffer;
}

export const NOISE_SECONDS = 4;

export type Bus = 'sfx' | 'music';

/** Ganancia máxima de cada bus; el volumen elegido (0..1) la escala. */
const BUS_GAIN: Record<Bus, number> = { sfx: 0.9, music: 0.6 };
const volumes: Record<Bus, number> = { sfx: 0.8, music: 0.6 };

export function setBusVolume(bus: Bus, value: number) {
  volumes[bus] = value;
  if (engine) engine[bus].gain.setTargetAtTime(BUS_GAIN[bus] * value, engine.ac.currentTime, 0.05);
}

export function busVolume(bus: Bus): number {
  return volumes[bus];
}

let engine: Engine | null = null;
let failed = false;

function create(): Engine {
  const ac = new AudioContext();
  const master = ac.createGain();
  master.gain.value = 0.6;
  master.connect(ac.destination);
  const sfx = ac.createGain();
  sfx.gain.value = BUS_GAIN.sfx * volumes.sfx;
  sfx.connect(master);
  const music = ac.createGain();
  music.gain.value = BUS_GAIN.music * volumes.music;
  music.connect(master);
  const noise = ac.createBuffer(1, ac.sampleRate * NOISE_SECONDS, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { ac, sfx, music, noise };
}

/** Devuelve el motor (creándolo la primera vez) o null si el navegador no tiene audio. */
export function getEngine(): Engine | null {
  if (failed) return null;
  if (!engine) {
    try {
      engine = create();
    } catch {
      failed = true;
      return null;
    }
  }
  if (engine.ac.state === 'suspended') void engine.ac.resume();
  return engine;
}
