// Estadísticas por ítem, con un sistema de cajas tipo Leitner:
// escribirlo bien lo sube de caja, equivocarse lo baja y si se escapa vuelve a 0.
import type { StudyItem } from '../data/types';

export const MAX_BOX = 5;
/** Desde esta caja un ítem se considera dominado. */
export const MASTERED_BOX = 4;
/** Caja en la que entra un ítem la primera vez que aparece. */
const START_BOX = 1;
/** Con la ayuda a la vista se puede subir hasta acá: para dominarlo hay que escribirlo sin ayuda. */
export const HELPED_MAX_BOX = 3;

export type Outcome = 'clean' | 'errors' | 'escaped';

export interface Encounter {
  item: StudyItem;
  outcome: Outcome;
  /** Si se vio el romaji o el furigana mientras se escribía. */
  helped?: boolean;
}

export interface ItemStats {
  box: number;
  seen: number;
  clean: number;
  errors: number;
  escaped: number;
  /** Timestamp de la última vez que apareció. */
  last: number;
}

export type MasteryLevel = 'unseen' | 'weak' | 'learning' | 'mastered';

const KEY = 'kotodama.stats';
let cache: Record<string, ItemStats> | null = null;

function all(): Record<string, ItemStats> {
  if (!cache) {
    try {
      cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, ItemStats>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(all()));
  } catch {
    // sin almacenamiento: el progreso dura solo esta sesión
  }
}

export function nextBox(box: number | undefined, outcome: Outcome, helped = false): number {
  const current = box ?? START_BOX;
  if (outcome === 'clean') return Math.max(current, Math.min(helped ? HELPED_MAX_BOX : MAX_BOX, current + 1));
  if (outcome === 'errors') return Math.max(0, current - 1);
  return 0;
}

export function statsOf(id: string): ItemStats | undefined {
  return all()[id];
}

/** Guarda un encuentro con un ítem. Devuelve true si con esto pasó a estar dominado. */
export function recordEncounter({ item, outcome, helped }: Encounter): boolean {
  const stats = all();
  const prev = stats[item.id];
  const wasMastered = (prev?.box ?? 0) >= MASTERED_BOX;
  const s: ItemStats = prev ?? { box: START_BOX, seen: 0, clean: 0, errors: 0, escaped: 0, last: 0 };
  s.box = nextBox(prev?.box, outcome, helped);
  s.seen++;
  s[outcome === 'clean' ? 'clean' : outcome === 'errors' ? 'errors' : 'escaped']++;
  s.last = Date.now();
  stats[item.id] = s;
  save();
  return !wasMastered && s.box >= MASTERED_BOX;
}

/** Caja actual de un ítem (los que nunca aparecieron cuentan como recién llegados). */
export function boxOf(id: string): number {
  return statsOf(id)?.box ?? START_BOX;
}

export function masteryOf(id: string): MasteryLevel {
  const s = statsOf(id);
  if (!s) return 'unseen';
  if (s.box >= MASTERED_BOX) return 'mastered';
  if (s.box >= 2) return 'learning';
  return 'weak';
}

const WEIGHT_BY_BOX = [6, 4, 3, 2, 1, 0.5];
const UNSEEN_WEIGHT = 3;

/** Peso para el sorteo: lo que más se falla sale más seguido; lo dominado, menos. */
export function reviewWeight(item: StudyItem): number {
  const s = statsOf(item.id);
  return s ? WEIGHT_BY_BOX[s.box] : UNSEEN_WEIGHT;
}

/** Los ítems ya vistos que más cuestan (para la partida de repaso). */
export function weakestItems(items: StudyItem[], max = 40): StudyItem[] {
  return items
    .filter((i) => {
      const s = statsOf(i.id);
      return s !== undefined && s.box < MASTERED_BOX - 1;
    })
    .sort((a, b) => {
      const sa = statsOf(a.id)!;
      const sb = statsOf(b.id)!;
      return sa.box - sb.box || sb.escaped + sb.errors - (sa.escaped + sa.errors);
    })
    .slice(0, max);
}

export function resetStats() {
  cache = {};
  save();
}
