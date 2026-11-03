import { KANA_ROMAJI } from './table';
import { toHiragana } from './kana';

/** Una unidad tipeable: uno o más kana que se escriben juntos (き, きゃ, っか...). */
export interface Unit {
  /** Kana tal como se muestra (en su escritura original). */
  kana: string;
  /** Romanizaciones aceptadas; la primera es la canónica. */
  options: string[];
}

const SMALL_TSU = KANA_ROMAJI['っ'];

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

function baseOptions(key: string): string[] {
  const direct = KANA_ROMAJI[key];
  const chars = [...key];
  if (chars.length === 1) {
    if (!direct) throw new Error(`Kana sin romanización: ${key}`);
    return direct;
  }
  // Combinación: además de la forma directa (kya) se acepta escribir cada kana por separado (kixya).
  const split = baseOptions(chars[0]).flatMap((a) => baseOptions(chars[1]).map((b) => a + b));
  return dedupe([...(direct ?? []), ...split]);
}

const GEMINABLE = /^[bcdfghjkmpqrstvwyz]/;

/** っ + siguiente unidad: se duplica la consonante (kitte, matcha/maccha) o se escribe la っ suelta (xtu). */
function geminate(nextOptions: string[]): string[] {
  const doubled = nextOptions.flatMap((o) => {
    if (!GEMINABLE.test(o)) return [];
    return o.startsWith('ch') ? ['t' + o, 'c' + o] : [o[0] + o];
  });
  const explicit = SMALL_TSU.flatMap((s) => nextOptions.map((o) => s + o));
  return dedupe([...doubled, ...explicit]);
}

/**
 * ん: antes de vocal o de "y" hace falta "nn" o "n'" (si no, かんい se confundiría con かに).
 * Antes de consonante (incluida la fila な: konnichiha) o al final alcanza con "n".
 */
function nOptions(nextKey: string | undefined): string[] {
  const strict = nextKey !== undefined && baseOptions(nextKey).some((o) => /^[aiueoy]/.test(o));
  return strict ? ['nn', "n'", 'xn'] : ['n', 'nn', "n'", 'xn'];
}

/** ー: guion o repetir la vocal anterior (コーヒー → ko-hi- / koohii). */
function longVowelOptions(prev: Unit | undefined): string[] {
  const vowel = prev?.options[0].slice(-1);
  return vowel && /[aiueo]/.test(vowel) ? ['-', vowel] : ['-'];
}

export function tokenize(reading: string): Unit[] {
  const original = [...reading];
  const hira = original.map(toHiragana);

  // Primero agrupamos combinaciones de dos kana (きゃ, ファ...) de forma golosa.
  const raw: { kana: string; key: string }[] = [];
  for (let i = 0; i < hira.length; ) {
    const pair = hira[i] + (hira[i + 1] ?? '');
    if (i + 1 < hira.length && KANA_ROMAJI[pair]) {
      raw.push({ kana: original[i] + original[i + 1], key: pair });
      i += 2;
    } else {
      raw.push({ kana: original[i], key: hira[i] });
      i += 1;
    }
  }

  const units: Unit[] = [];
  for (let i = 0; i < raw.length; i++) {
    const { kana, key } = raw[i];
    const next = raw[i + 1];
    if (key === 'っ' && next && baseOptions(next.key).some((o) => GEMINABLE.test(o))) {
      units.push({ kana: kana + next.kana, options: geminate(baseOptions(next.key)) });
      i++;
    } else if (key === 'ん') {
      units.push({ kana, options: nOptions(next?.key) });
    } else if (key === 'ー') {
      units.push({ kana, options: longVowelOptions(units[units.length - 1]) });
    } else {
      units.push({ kana, options: baseOptions(key) });
    }
  }
  return units;
}

/**
 * Igual que tokenize, pero suma las romanizaciones de lecturas alternativas de la
 * misma longitud (ej. こんにちは / こんにちわ, para aceptar "wa" en la partícula).
 */
export function tokenizeWithAlternatives(reading: string, alternatives: string[] = []): Unit[] {
  const units = tokenize(reading);
  for (const alt of alternatives) {
    const other = tokenize(alt);
    if (other.length !== units.length) throw new Error(`Lectura alternativa incompatible: ${reading} / ${alt}`);
    other.forEach((u, i) => {
      units[i] = { ...units[i], options: dedupe([...units[i].options, ...u.options]) };
    });
  }
  return units;
}

export function canonicalRomaji(reading: string): string {
  return tokenize(reading)
    .map((u) => u.options[0])
    .join('');
}

interface State {
  /** Índice de la lectura que sigue este estado. */
  path: number;
  unit: number;
  buf: string;
}

/**
 * Valida tecla por tecla si lo escrito sigue siendo un prefijo de alguna
 * romanización válida. Mantiene varios estados en paralelo porque una misma
 * secuencia puede ser válida de más de una forma (ん = n / nn) y porque un
 * ítem puede tener varias lecturas completas (水 = スイ / みず).
 */
export class RomajiMatcher {
  private readonly readings: string[];
  private readonly paths: Unit[][];
  private states: State[];
  private typedText = '';

  /**
   * @param alternatives lecturas de la misma longitud que se mezclan unidad por unidad (こんにちわ).
   * @param variants otras lecturas completas, de cualquier longitud (para kanji sueltos).
   */
  constructor(reading: string, alternatives: string[] = [], variants: string[] = []) {
    this.readings = [reading, ...variants];
    this.paths = [tokenizeWithAlternatives(reading, alternatives), ...variants.map((v) => tokenize(v))];
    this.states = [];
    this.reset();
  }

  get typed(): string {
    return this.typedText;
  }

  get done(): boolean {
    return this.states.some((s) => this.isComplete(s));
  }

  /** Unidades de la lectura que se está siguiendo (la más avanzada). */
  get units(): Unit[] {
    return this.paths[this.best.path];
  }

  /** Índice de la lectura que se está siguiendo (0 = principal). */
  get pathIndex(): number {
    return this.best.path;
  }

  /** Lectura en kana que se está siguiendo. */
  get reading(): string {
    return this.readings[this.best.path];
  }

  /** Cantidad de unidades ya completas (según el camino más avanzado). */
  get completedUnits(): number {
    return this.best.unit;
  }

  /** Teclas que serían válidas ahora mismo (ej. し sin escribir → s, c). */
  nextKeys(): Set<string> {
    const keys = new Set<string>();
    for (const s of this.states) {
      const units = this.paths[s.path];
      if (s.unit >= units.length) continue;
      for (const opt of units[s.unit].options) {
        if (opt.length > s.buf.length && opt.startsWith(s.buf)) keys.add(opt[s.buf.length]);
      }
    }
    return keys;
  }

  /** Descarta lo escrito y vuelve al principio. */
  reset() {
    this.states = this.paths.map((_, path) => ({ path, unit: 0, buf: '' }));
    this.typedText = '';
  }

  canType(key: string): boolean {
    return !this.done && this.advance(key).length > 0;
  }

  /** Devuelve true si la tecla es válida (y la consume). */
  type(key: string): boolean {
    if (this.done) return false;
    const next = this.advance(key);
    if (next.length === 0) return false;
    this.states = next;
    this.typedText += key;
    return true;
  }

  /** Romaji sugerido para lo que falta escribir. */
  remainingHint(): string {
    const best = this.best;
    const units = this.paths[best.path];
    if (best.unit >= units.length) return '';
    const current = units[best.unit].options.find((o) => o.startsWith(best.buf)) ?? '';
    let rest = current.slice(best.buf.length);
    for (let i = best.unit + 1; i < units.length; i++) rest += units[i].options[0];
    return rest;
  }

  private isComplete(s: State): boolean {
    return s.unit >= this.paths[s.path].length;
  }

  private get best(): State {
    return [...this.states].sort(
      (a, b) =>
        Number(this.isComplete(b)) - Number(this.isComplete(a)) ||
        b.unit - a.unit ||
        b.buf.length - a.buf.length ||
        a.path - b.path,
    )[0];
  }

  private advance(key: string): State[] {
    const out = new Map<string, State>();
    for (const s of this.states) {
      const units = this.paths[s.path];
      if (s.unit >= units.length) continue;
      const buf = s.buf + key;
      for (const opt of units[s.unit].options) {
        if (opt === buf) out.set(`${s.path}|${s.unit + 1}|`, { path: s.path, unit: s.unit + 1, buf: '' });
        else if (opt.startsWith(buf)) out.set(`${s.path}|${s.unit}|${buf}`, { path: s.path, unit: s.unit, buf });
      }
    }
    return [...out.values()];
  }
}
