// Campaña: niveles en orden de aprendizaje para N5. Cada nivel se desbloquea al ganar el anterior.
import type { GameResult } from '../game/game';

export interface CampaignLevel {
  id: string;
  chapter: string;
  title: string;
  jp: string;
  /** Ids de grupos de contenido (ver data/index.ts). */
  groups: string[];
}

/** Oleadas de un nivel de campaña (la última trae al jefe). */
export const CAMPAIGN_WAVES = 5;

const H = (...rows: string[]) => rows.map((r) => `hiragana:${r}`);
const K = (...rows: string[]) => rows.map((r) => `katakana:${r}`);
const HW = (...g: string[]) => g.map((x) => `words-hiragana:${x}`);
const KW = (...g: string[]) => g.map((x) => `words-katakana:${x}`);
const KJ = (...g: string[]) => g.map((x) => `kanji:${x}`);
const KJW = (...g: string[]) => g.map((x) => `words-kanji:${x}`);

const BASIC_ROWS = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];
const DAKUTEN_ROWS = ['g', 'z', 'd', 'b', 'p'];

export const LEVELS: CampaignLevel[] = [
  // Capítulo 1: hiragana
  { id: 'h1', chapter: 'Hiragana', title: 'Las vocales', jp: 'あいうえお', groups: H('a') },
  { id: 'h2', chapter: 'Hiragana', title: 'Filas K y S', jp: 'かさ', groups: H('a', 'k', 's') },
  { id: 'h3', chapter: 'Hiragana', title: 'Filas T y N', jp: 'たな', groups: H('k', 's', 't', 'n') },
  { id: 'h4', chapter: 'Hiragana', title: 'Filas H y M', jp: 'はま', groups: H('t', 'n', 'h', 'm') },
  { id: 'h5', chapter: 'Hiragana', title: 'Filas Y, R y W', jp: 'やらわ', groups: H('h', 'm', 'y', 'r', 'w') },
  { id: 'h6', chapter: 'Hiragana', title: 'Repaso de hiragana', jp: 'ふくしゅう', groups: H(...BASIC_ROWS) },
  { id: 'h7', chapter: 'Hiragana', title: 'Dakuten y handakuten', jp: 'がざだばぱ', groups: H(...DAKUTEN_ROWS) },
  { id: 'h8', chapter: 'Hiragana', title: 'Combinados', jp: 'きゃ', groups: H('yoon', 'yoon-d') },
  { id: 'h9', chapter: 'Hiragana', title: 'Primeras palabras', jp: 'こんにちは', groups: HW('expresiones', 'demostrativos') },
  { id: 'h10', chapter: 'Hiragana', title: 'Adjetivos y verbos', jp: 'おいしい', groups: HW('adjetivos', 'verbos') },
  { id: 'h11', chapter: 'Hiragana', title: 'La vida diaria', jp: 'まいにち', groups: HW('cosas', 'lugares', 'tiempo', 'naturaleza') },
  // Capítulo 2: katakana
  { id: 'k1', chapter: 'Katakana', title: 'De ア a ソ', jp: 'アカサ', groups: K('a', 'k', 's') },
  { id: 'k2', chapter: 'Katakana', title: 'De タ a ホ', jp: 'タナハ', groups: K('s', 't', 'n', 'h') },
  { id: 'k3', chapter: 'Katakana', title: 'De マ a ン', jp: 'マヤラワ', groups: K('h', 'm', 'y', 'r', 'w') },
  { id: 'k4', chapter: 'Katakana', title: 'Dakuten y combinados', jp: 'ガキャ', groups: K(...DAKUTEN_ROWS, 'yoon', 'yoon-d') },
  { id: 'k5', chapter: 'Katakana', title: 'Sonidos extranjeros', jp: 'ファティ', groups: K('ext') },
  { id: 'k6', chapter: 'Katakana', title: 'Palabras de la casa', jp: 'テレビ', groups: KW('comida', 'ropa', 'casa') },
  { id: 'k7', chapter: 'Katakana', title: 'Más palabras', jp: 'ホテル', groups: KW('lugares', 'otras', 'paises') },
  // Capítulo 3: kanji
  { id: 'j1', chapter: 'Kanji', title: 'Números', jp: '一二三', groups: [...KJ('numeros'), ...KJW('numeros')] },
  { id: 'j2', chapter: 'Kanji', title: 'Fechas y días', jp: '月火水', groups: [...KJ('tiempo'), ...KJW('fechas', 'dias')] },
  { id: 'j3', chapter: 'Kanji', title: 'Personas', jp: '人', groups: [...KJ('personas'), ...KJW('personas')] },
  { id: 'j4', chapter: 'Kanji', title: 'Lugares', jp: '上下', groups: [...KJ('lugares'), ...KJW('lugares')] },
  { id: 'j5', chapter: 'Kanji', title: 'Verbos y adjetivos', jp: '見る', groups: [...KJ('verbos', 'adjetivos'), ...KJW('verbos', 'adjetivos')] },
  { id: 'j6', chapter: 'Kanji', title: 'Naturaleza y cosas', jp: '雨', groups: [...KJ('otros'), ...KJW('cosas')] },
  {
    id: 'final',
    chapter: 'Examen final',
    title: 'Todo N5',
    jp: '試験',
    groups: [...HW('expresiones', 'adjetivos', 'verbos', 'cosas', 'lugares', 'tiempo'), ...KW('comida', 'casa', 'lugares'),
      ...KJW('numeros', 'fechas', 'dias', 'personas', 'lugares', 'verbos', 'adjetivos', 'cosas')],
  },
];

interface CampaignProgress {
  /** Mejor cantidad de estrellas por nivel (solo niveles ganados). */
  stars: Record<string, number>;
}

const KEY = 'kotodama.campaign';

function load(): CampaignProgress {
  try {
    return { stars: {}, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { stars: {} };
  }
}

export function levelStars(id: string): number {
  return load().stars[id] ?? 0;
}

export function isUnlocked(index: number): boolean {
  return index === 0 || levelStars(LEVELS[index - 1].id) > 0;
}

/** ★ ganar · ★★ con 90 % de precisión · ★★★ con 95 % y sin perder faroles. */
export function starsFor(result: GameResult): number {
  if (!result.victory) return 0;
  const accuracy = result.keystrokes ? (result.keystrokes - result.errors) / result.keystrokes : 1;
  if (accuracy >= 0.95 && result.livesLeft === result.maxLives) return 3;
  if (accuracy >= 0.9) return 2;
  return 1;
}

/** Guarda el resultado (se queda con la mejor marca). */
export function saveLevelResult(id: string, stars: number) {
  const progress = load();
  if (stars <= (progress.stars[id] ?? 0)) return;
  progress.stars[id] = stars;
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignorado
  }
}

export function resetCampaign() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorado
  }
}
