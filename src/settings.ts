import type { Difficulty } from './game/game';

export type GameMode = 'partida' | 'infinito';

export type MenuTab = 'campana' | 'practica' | 'progreso';

/** Volúmenes de 0 a 1 (0 = apagado). */
export interface Volumes {
  music: number;
  sfx: number;
  voice: number;
}

export interface Settings {
  /** Ids de grupos seleccionados (ej. "hiragana:k", "words-katakana:ropa"). */
  groups: string[];
  difficulty: Difficulty;
  mode: GameMode;
  showHints: boolean;
  showFurigana: boolean;
  /** Lo que más se falla aparece más seguido. */
  smartReview: boolean;
  /** Última pestaña abierta del menú. */
  tab: MenuTab;
  volumes: Volumes;
}

/** Oleadas de una partida normal (la última trae al jefe). */
export const WAVES_PER_GAME = 10;

const KEY = 'kotodama.settings';

const DEFAULTS: Settings = {
  groups: ['hiragana:a', 'hiragana:k', 'hiragana:s'],
  difficulty: 'normal',
  mode: 'partida',
  showHints: true,
  showFurigana: true,
  smartReview: true,
  tab: 'campana',
  volumes: { music: 0.6, sfx: 0.8, voice: 0.9 },
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULTS, ...saved, volumes: { ...DEFAULTS.volumes, ...saved.volumes } };
    }
  } catch {
    // almacenamiento no disponible: usamos los valores por defecto
  }
  return structuredClone(DEFAULTS);
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignorado
  }
}
