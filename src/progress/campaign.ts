// Campaña: tres caminos para N5. Hiragana y katakana se juegan en paralelo (no dependen
// uno del otro); kanji se desbloquea al conocer los dos silabarios; el examen final pide todo.
// En los niveles de palabras tempranos solo aparecen las que se escriben con los kana ya aprendidos.
import { groupsForIds } from '../data';
import type { StudyItem } from '../data/types';
import type { GameResult } from '../game/game';
import { toKatakana } from '../romaji/kana';

export type TrackId = 'hiragana' | 'katakana' | 'kanji' | 'final';

export interface Track {
  id: TrackId;
  name: string;
  jp: string;
  description: string;
  /** Niveles (de otros caminos) que hay que ganar para empezar este camino. */
  requires: string[];
}

export interface CampaignLevel {
  id: string;
  track: TrackId;
  title: string;
  jp: string;
  /** Ids de grupos de contenido (ver data/index.ts). */
  groups: string[];
  /**
   * Grupos de kana ya aprendidos: si está, de los grupos de palabras solo se usan las que
   * se escriben únicamente con esos kana.
   */
  knownKana?: string[];
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
const ALL_HIRAGANA_WORDS = HW('expresiones', 'demostrativos', 'adjetivos', 'verbos', 'cosas', 'lugares', 'tiempo', 'naturaleza');
const ALL_KATAKANA_WORDS = KW('comida', 'ropa', 'casa', 'lugares', 'otras', 'paises');

export const TRACKS: Track[] = [
  {
    id: 'hiragana',
    name: 'Hiragana',
    jp: 'ひらがな',
    description: 'El silabario base. Después de algunas filas vienen palabras que ya podés leer.',
    requires: [],
  },
  {
    id: 'katakana',
    name: 'Katakana',
    jp: 'カタカナ',
    description: 'Para palabras extranjeras. Se puede aprender en paralelo con hiragana.',
    requires: [],
  },
  {
    id: 'kanji',
    name: 'Kanji',
    jp: 'かんじ',
    description: 'Las lecturas se escriben en kana: se desbloquea al conocer todos los caracteres de hiragana y katakana.',
    requires: ['h-yoon', 'k-ext'],
  },
  {
    id: 'final',
    name: 'Examen final',
    jp: 'しけん',
    description: 'Todo lo del N5 mezclado. Se desbloquea al completar los tres caminos.',
    requires: ['h-vida', 'k-mas', 'j-cosas'],
  },
];

export const LEVELS: CampaignLevel[] = [
  // Hiragana
  { id: 'h-a', track: 'hiragana', title: 'Las vocales', jp: 'あいうえお', groups: H('a') },
  { id: 'h-ks', track: 'hiragana', title: 'Filas K y S', jp: 'かさ', groups: H('a', 'k', 's') },
  { id: 'h-tn', track: 'hiragana', title: 'Filas T y N', jp: 'たな', groups: H('k', 's', 't', 'n') },
  {
    id: 'h-pal1', track: 'hiragana', title: 'Primeras palabras', jp: 'いす',
    groups: ALL_HIRAGANA_WORDS, knownKana: H('a', 'k', 's', 't', 'n'),
  },
  { id: 'h-hm', track: 'hiragana', title: 'Filas H y M', jp: 'はま', groups: H('t', 'n', 'h', 'm') },
  { id: 'h-yrw', track: 'hiragana', title: 'Filas Y, R y W', jp: 'やらわ', groups: H('h', 'm', 'y', 'r', 'w') },
  {
    id: 'h-pal2', track: 'hiragana', title: 'Palabras con todo el silabario', jp: 'ともだち',
    groups: [...H(...BASIC_ROWS), ...ALL_HIRAGANA_WORDS], knownKana: H(...BASIC_ROWS),
  },
  { id: 'h-daku', track: 'hiragana', title: 'Dakuten y handakuten', jp: 'がざだばぱ', groups: H(...DAKUTEN_ROWS) },
  { id: 'h-yoon', track: 'hiragana', title: 'Combinados', jp: 'きゃ', groups: H('yoon', 'yoon-d') },
  { id: 'h-frases', track: 'hiragana', title: 'Saludos y preguntas', jp: 'こんにちは', groups: HW('expresiones', 'demostrativos') },
  { id: 'h-adjv', track: 'hiragana', title: 'Adjetivos y verbos', jp: 'おいしい', groups: HW('adjetivos', 'verbos') },
  { id: 'h-vida', track: 'hiragana', title: 'La vida diaria', jp: 'まいにち', groups: HW('cosas', 'lugares', 'tiempo', 'naturaleza') },
  // Katakana
  { id: 'k-aks', track: 'katakana', title: 'De ア a ソ', jp: 'アカサ', groups: K('a', 'k', 's') },
  { id: 'k-tnh', track: 'katakana', title: 'De タ a ホ', jp: 'タナハ', groups: K('s', 't', 'n', 'h') },
  { id: 'k-myrw', track: 'katakana', title: 'De マ a ン', jp: 'マヤラワ', groups: K('h', 'm', 'y', 'r', 'w') },
  {
    id: 'k-pal1', track: 'katakana', title: 'Primeras palabras', jp: 'ホテル',
    groups: [...K(...BASIC_ROWS), ...ALL_KATAKANA_WORDS], knownKana: K(...BASIC_ROWS),
  },
  { id: 'k-daku', track: 'katakana', title: 'Dakuten y combinados', jp: 'ガキャ', groups: K(...DAKUTEN_ROWS, 'yoon', 'yoon-d') },
  { id: 'k-ext', track: 'katakana', title: 'Sonidos extranjeros', jp: 'ファティ', groups: K('ext') },
  { id: 'k-casa', track: 'katakana', title: 'Palabras de la casa', jp: 'テレビ', groups: KW('comida', 'ropa', 'casa') },
  { id: 'k-mas', track: 'katakana', title: 'Más palabras', jp: 'パーティー', groups: KW('lugares', 'otras', 'paises') },
  // Kanji
  { id: 'j1', track: 'kanji', title: 'Números', jp: '一二三', groups: [...KJ('numeros'), ...KJW('numeros')] },
  { id: 'j2', track: 'kanji', title: 'Fechas y días', jp: '月火水', groups: [...KJ('tiempo'), ...KJW('fechas', 'dias')] },
  { id: 'j3', track: 'kanji', title: 'Personas', jp: '人', groups: [...KJ('personas'), ...KJW('personas')] },
  { id: 'j4', track: 'kanji', title: 'Lugares', jp: '上下', groups: [...KJ('lugares'), ...KJW('lugares')] },
  { id: 'j5', track: 'kanji', title: 'Verbos y adjetivos', jp: '見る', groups: [...KJ('verbos', 'adjetivos'), ...KJW('verbos', 'adjetivos')] },
  { id: 'j-cosas', track: 'kanji', title: 'Naturaleza y cosas', jp: '雨', groups: [...KJ('otros'), ...KJW('cosas')] },
  // Examen final
  {
    id: 'final',
    track: 'final',
    title: 'Todo N5',
    jp: '試験',
    groups: [...HW('expresiones', 'adjetivos', 'verbos', 'cosas', 'lugares', 'tiempo'), ...KW('comida', 'casa', 'lugares'),
      ...KJW('numeros', 'fechas', 'dias', 'personas', 'lugares', 'verbos', 'adjetivos', 'cosas')],
  },
];

/** Ids de la primera versión (campaña lineal) → ids actuales, para no perder estrellas ganadas. */
const OLD_IDS: Record<string, string> = {
  h1: 'h-a', h2: 'h-ks', h3: 'h-tn', h4: 'h-hm', h5: 'h-yrw', h7: 'h-daku', h8: 'h-yoon',
  h9: 'h-frases', h10: 'h-adjv', h11: 'h-vida',
  k1: 'k-aks', k2: 'k-tnh', k3: 'k-myrw', k4: 'k-daku', k5: 'k-ext', k6: 'k-casa', k7: 'k-mas',
  j6: 'j-cosas',
};

/** Kana que se consideran conocidos: los de esos grupos, la っ si se conoce la つ, y ー. */
function knownKanaSet(groupIds: string[]): Set<string> {
  const known = new Set(['ー']);
  for (const item of groupsForIds(groupIds).flatMap((g) => g.items)) {
    for (const ch of item.text) known.add(ch);
  }
  if (known.has('つ')) known.add('っ');
  if (known.has(toKatakana('つ'))) known.add(toKatakana('っ'));
  return known;
}

/** Contenido de un nivel, un pool por grupo (sin los grupos que quedan vacíos por el filtro). */
export function levelPools(level: CampaignLevel): StudyItem[][] {
  const groups = groupsForIds(level.groups);
  if (!level.knownKana) return groups.map((g) => g.items);
  const known = knownKanaSet(level.knownKana);
  return groups
    .map((g) => (g.items[0]?.kind === 'word' ? g.items.filter((i) => [...i.reading].every((ch) => known.has(ch))) : g.items))
    .filter((p) => p.length > 0);
}

export function levelItems(level: CampaignLevel): StudyItem[] {
  return levelPools(level).flat();
}

interface CampaignProgress {
  /** Mejor cantidad de estrellas por nivel (solo niveles ganados). */
  stars: Record<string, number>;
}

const KEY = 'kotodama.campaign';

function load(): CampaignProgress {
  let progress: CampaignProgress;
  try {
    progress = { stars: {}, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { stars: {} };
  }
  for (const [old, id] of Object.entries(OLD_IDS)) {
    if (progress.stars[old] !== undefined) {
      progress.stars[id] = Math.max(progress.stars[id] ?? 0, progress.stars[old]);
      delete progress.stars[old];
    }
  }
  return progress;
}

export function levelStars(id: string): number {
  return load().stars[id] ?? 0;
}

/** Niveles que hay que ganar para desbloquear este: el anterior del camino, o los requisitos del camino. */
export function requirementsOf(level: CampaignLevel): CampaignLevel[] {
  const inTrack = LEVELS.filter((l) => l.track === level.track);
  const index = inTrack.indexOf(level);
  const ids = index > 0 ? [inTrack[index - 1].id] : TRACKS.find((t) => t.id === level.track)!.requires;
  return ids.map((id) => LEVELS.find((l) => l.id === id)!);
}

export function isUnlocked(level: CampaignLevel): boolean {
  return requirementsOf(level).every((r) => levelStars(r.id) > 0);
}

/** El próximo nivel sin ganar de un camino, si está desbloqueado. */
export function nextInTrack(track: TrackId): CampaignLevel | null {
  return LEVELS.find((l) => l.track === track && levelStars(l.id) === 0 && isUnlocked(l)) ?? null;
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
  progress.stars[id] = Math.max(stars, progress.stars[id] ?? 0);
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
