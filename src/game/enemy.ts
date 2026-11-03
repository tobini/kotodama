import type { StudyItem } from '../data/types';
import { RomajiMatcher } from '../romaji/matcher';

export type EnemyState = 'alive' | 'banished' | 'dead';

/**
 * - hitodama: fuego fantasma, el yōkai básico.
 * - tengu: rápido y zigzagueante; suele llevar cosas cortas.
 * - oni: lento pero con varias capas (hay que escribir 2 o 3 cosas seguidas).
 * - kitsune: su cartel aparece y desaparece.
 * - boss: el Ōoni del final, con muchas capas.
 */
export type EnemyKind = 'hitodama' | 'tengu' | 'oni' | 'kitsune' | 'boss';

interface KindSpec {
  name: string;
  /** Descripción que se muestra la primera vez que aparece. */
  hint: string;
  speed: number;
  radius: number;
  bob: number;
  bobFreq: number;
  /** Retroceso (px) al romperle una capa. */
  knockback: number;
}

export const KINDS: Record<EnemyKind, KindSpec> = {
  hitodama: { name: 'Hitodama', hint: '', speed: 1, radius: 20, bob: 8, bobFreq: 1.6, knockback: 0 },
  tengu: { name: 'Tengu', hint: 'rápido y zigzagueante', speed: 1.45, radius: 22, bob: 34, bobFreq: 2.4, knockback: 0 },
  oni: { name: 'Oni', hint: 'lento, pero con varias palabras', speed: 0.62, radius: 28, bob: 4, bobFreq: 1, knockback: 30 },
  kitsune: { name: 'Kitsune', hint: 'su cartel se desvanece', speed: 1, radius: 22, bob: 10, bobFreq: 1.3, knockback: 0 },
  boss: { name: 'Ōoni', hint: '¡el jefe!', speed: 0.3, radius: 62, bob: 6, bobFreq: 0.7, knockback: 55 },
};

const BANISH_SECONDS = 0.35;
const KITSUNE_CYCLE = 4.2;

function matcherFor(item: StudyItem): RomajiMatcher {
  return new RomajiMatcher(item.reading, item.altReadings, item.variants);
}

const firstKeysCache = new WeakMap<StudyItem, Set<string>>();

/** Letras con las que se puede empezar a escribir un ítem (し → s, c). */
export function firstKeys(item: StudyItem): Set<string> {
  let keys = firstKeysCache.get(item);
  if (!keys) {
    keys = matcherFor(item).nextKeys();
    firstKeysCache.set(item, keys);
  }
  return keys;
}

export class Enemy {
  matcher: RomajiMatcher;
  state: EnemyState = 'alive';
  /** 0..1 mientras se desvanece al ser desterrado. */
  fade = 0;
  /** Segundos restantes del destello rojo por error. */
  errorFlash = 0;
  /** Segundos restantes del destello al romper una capa. */
  hitFlash = 0;
  /** Errores cometidos en la capa actual (para las estadísticas). */
  layerErrors = 0;
  readonly phase = Math.random() * Math.PI * 2;
  private age = 0;
  private index = 0;
  private pushBack = 0;

  constructor(
    readonly kind: EnemyKind,
    readonly items: StudyItem[],
    public x: number,
    readonly baseY: number,
    public speed: number,
  ) {
    this.matcher = matcherFor(items[0]);
  }

  get spec(): KindSpec {
    return KINDS[this.kind];
  }

  get item(): StudyItem {
    return this.items[this.index];
  }

  /** Capas que quedan, incluida la actual. */
  get remaining(): number {
    return this.items.length - this.index;
  }

  get y(): number {
    return this.baseY + Math.sin(this.age * this.spec.bobFreq + this.phase) * this.spec.bob;
  }

  get alive(): boolean {
    return this.state === 'alive';
  }

  /** Opacidad del cartel. El kitsune lo oculta a ratos (salvo cuando ya se empezó a escribir). */
  get labelAlpha(): number {
    if (this.kind !== 'kitsune') return 1;
    const c = (this.age + this.phase) % KITSUNE_CYCLE;
    let a: number;
    if (c < 2.4) a = 1;
    else if (c < 2.8) a = 1 - (c - 2.4) / 0.4;
    else if (c < 3.8) a = 0;
    else a = (c - 3.8) / 0.4;
    return Math.max(this.matcher.typed ? 0.6 : 0.05, a);
  }

  update(dt: number) {
    this.age += dt;
    this.errorFlash = Math.max(0, this.errorFlash - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.state === 'alive') {
      if (this.pushBack > 0) {
        const p = Math.min(this.pushBack, 300 * dt);
        this.x += p;
        this.pushBack -= p;
      } else {
        this.x -= this.speed * dt;
      }
    } else if (this.state === 'banished') {
      this.fade += dt / (this.kind === 'boss' ? BANISH_SECONDS * 4 : BANISH_SECONDS);
      if (this.fade >= 1) this.state = 'dead';
    }
  }

  /** Pasa a la siguiente capa. Devuelve false si no quedaban más. */
  nextItem(): boolean {
    if (this.index + 1 >= this.items.length) return false;
    this.index++;
    this.matcher = matcherFor(this.item);
    this.layerErrors = 0;
    this.pushBack += this.spec.knockback;
    this.hitFlash = 0.3;
    return true;
  }

  banish() {
    this.state = 'banished';
    this.fade = 0;
  }
}
