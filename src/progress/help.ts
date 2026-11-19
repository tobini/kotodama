// Ayuda gradual: el romaji y el furigana se van retirando a medida que se aprende cada
// kana o kanji (según su caja de repaso).
import { ALL_ITEMS } from '../data';
import type { StudyItem } from '../data/types';
import { boxOf, MASTERED_BOX } from './stats';

/**
 * - full: la ayuda se ve desde que aparece.
 * - delayed: aparece si se duda un rato o al equivocarse.
 * - none: no aparece (al equivocarse se muestra solo lo que sigue).
 * - off: no aparece nunca (ayuda desactivada).
 */
export type HelpStage = 'full' | 'delayed' | 'none' | 'off';

/** auto = según lo que ya se sabe; siempre/nunca fuerzan la ayuda. */
export type HelpMode = 'auto' | 'siempre' | 'nunca';

export function stageForBox(box: number): HelpStage {
  if (box >= MASTERED_BOX) return 'none';
  return box >= 2 ? 'delayed' : 'full';
}

const STAGE_ORDER: HelpStage[] = ['off', 'none', 'delayed', 'full'];

/** La etapa que más ayuda de las dos. */
function mostHelp(a: HelpStage, b: HelpStage): HelpStage {
  return STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b) ? a : b;
}

let kanaByText: Map<string, StudyItem> | null = null;
let kanjiByChar: Map<string, StudyItem> | null = null;

function lookups() {
  if (!kanaByText || !kanjiByChar) {
    kanaByText = new Map();
    kanjiByChar = new Map();
    for (const item of ALL_ITEMS) {
      const map = item.kind === 'kana' ? kanaByText : item.kind === 'kanji' ? kanjiByChar : null;
      if (map && !map.has(item.text)) map.set(item.text, item);
    }
  }
  return { kanaByText, kanjiByChar };
}

/**
 * El kana suelto que se practica con una unidad de una palabra (っち → ち).
 * ー y los kana que no tienen ítem propio no tienen uno.
 */
export function kanaItemForUnit(unitKana: string): StudyItem | undefined {
  const text = unitKana.replace(/^[っッ]/, '');
  return text ? lookups().kanaByText.get(text) : undefined;
}

/** Etapa de la ayuda en romaji para cada unidad de algo escrito en kana. */
export function romajiStages(unitKana: string[], mode: HelpMode): HelpStage[] {
  if (mode !== 'auto') return unitKana.map(() => (mode === 'siempre' ? 'full' : 'off'));
  return unitKana.map((kana) => {
    const item = kanaItemForUnit(kana);
    return item ? stageForBox(boxOf(item.id)) : 'none';
  });
}

/** Etapa del furigana de algo con kanji: hasta dominar la palabra y cada uno de sus kanji. */
export function furiganaStage(item: StudyItem, mode: HelpMode): HelpStage {
  if (mode !== 'auto') return mode === 'siempre' ? 'full' : 'off';
  let stage = stageForBox(boxOf(item.id));
  for (const char of item.text) {
    const kanji = lookups().kanjiByChar.get(char);
    if (kanji && kanji !== item) stage = mostHelp(stage, stageForBox(boxOf(kanji.id)));
  }
  return stage;
}
