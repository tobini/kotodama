import { playMusic, setMusicIntensity } from '../audio/music';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/voice';
import type { StudyItem } from '../data/types';
import type { Encounter } from '../progress/stats';
import { canonicalRomaji } from '../romaji/matcher';
import { Effects } from './effects';
import { Enemy, KINDS, firstKeys, type EnemyKind } from './enemy';
import {
  DEFENSE_X, GROUND_Y, SHRINE_ORIGIN, drawBanner, drawDefenseLine, drawEnemy, drawHud, drawMist, drawShrine,
  drawTargetLink,
} from './scene';
import { H, Stage, W } from './stage';

const DIFFICULTY = {
  facil: { speed: 0.75, spawn: 1.3 },
  normal: { speed: 1, spawn: 1 },
  dificil: { speed: 1.3, spawn: 0.8 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY;

export interface GameConfig {
  /**
   * Un pool por grupo elegido. Se sortea primero el grupo y después el ítem, así los
   * grupos grandes (ej. combinados) no tapan a los chicos.
   */
  pools: StudyItem[][];
  showHints: boolean;
  /** Mostrar la lectura sobre los kanji antes de escribirla. */
  showFurigana: boolean;
  difficulty: Difficulty;
  /** null = modo infinito. */
  totalWaves: number | null;
  onPauseChange?: (paused: boolean) => void;
  /** Peso de cada ítem al sortear (repaso inteligente). Sin esto, todos pesan igual. */
  weightOf?: (item: StudyItem) => number;
  /** Oleada inicial (para probar; por defecto 1). */
  startWave?: number;
}

export interface ItemReport {
  item: StudyItem;
  errors: number;
  escaped: number;
}

export interface GameResult {
  victory: boolean;
  score: number;
  wave: number;
  totalWaves: number | null;
  defeated: number;
  keystrokes: number;
  errors: number;
  maxCombo: number;
  seconds: number;
  livesLeft: number;
  maxLives: number;
  struggles: ItemReport[];
  /** Cómo le fue con cada ítem que apareció (para las estadísticas). */
  encounters: Encounter[];
}

const MAX_LIVES = 3;
const MIN_Y = 175;
const MAX_Y = GROUND_Y - 35;
const BANNER_SECONDS = 2.2;
/** Cuánto carga el kamikaze cada palabra/kana completado (14 para llenarlo). */
const KAMIKAZE_PER_ITEM = 1 / 14;
/** En modo infinito, cada cuántas oleadas aparece un jefe. */
const BOSS_EVERY = 5;
const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function kanjiNumber(n: number): string {
  if (n <= 10) return KANJI_NUMBERS[n];
  const tens = Math.floor(n / 10);
  return (tens > 1 ? KANJI_NUMBERS[tens] : '') + '十' + KANJI_NUMBERS[n % 10];
}

export class Game {
  private enemies: Enemy[] = [];
  private target: Enemy | null = null;
  /**
   * Si lo escrito coincide con varios yōkai, avanza en todos (candidatos) hasta que
   * una tecla deja a uno solo, que pasa a ser el objetivo.
   */
  private candidates: Enemy[] = [];
  private effects = new Effects();
  private lives = MAX_LIVES;
  private livesAtWaveStart = MAX_LIVES;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private keystrokes = 0;
  private errors = 0;
  private defeated = 0;
  private wave = 0;
  private waveTotal = 0;
  private waveSpawned = 0;
  private bossPending = false;
  private bossWave = false;
  private spawnTimer = 0;
  private kamikaze = 0;
  private banner = { title: '', sub: '', time: 0, duration: 0 };
  private paused = false;
  private endTimer = -1;
  private time = 0;
  private lastFrame = 0;
  private raf = 0;
  private shake = 0;
  private reports = new Map<string, ItemReport>();
  private encounters: Encounter[] = [];
  private recent: string[] = [];
  private seenKinds = new Set<EnemyKind>(['hitodama']);
  private victory = false;
  private readonly diff: (typeof DIFFICULTY)[Difficulty];

  constructor(
    private readonly stage: Stage,
    private readonly background: HTMLCanvasElement,
    private readonly config: GameConfig,
    private readonly onEnd: (result: GameResult) => void,
  ) {
    this.diff = DIFFICULTY[config.difficulty];
  }

  start() {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('blur', this.onBlur);
    this.wave = (this.config.startWave ?? 1) - 1;
    this.nextWave();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('blur', this.onBlur);
  }

  setPaused(paused: boolean) {
    if (this.paused === paused || this.endTimer >= 0) return;
    this.paused = paused;
    playMusic(paused ? 'calma' : 'batalla');
    this.config.onPauseChange?.(paused);
  }

  /** Termina la partida y muestra los resultados. */
  quit() {
    this.endTimer = 0;
  }

  // ---------------------------------------------------------------- loop

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (!this.paused) this.update(dt);
    this.draw();
    if (this.endTimer === 0) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.time += dt;
    this.banner.time = Math.max(0, this.banner.time - dt);
    this.shake = Math.max(0, this.shake - dt * 30);

    if (this.endTimer > 0) {
      this.endTimer = Math.max(0, this.endTimer - dt);
    } else if (this.bossPending || this.waveSpawned < this.waveTotal) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        if (this.bossPending) {
          this.spawnBoss();
          this.spawnTimer = 4;
        } else {
          const units = this.spawn().matcher.units.length;
          // Después de una palabra larga damos un poco más de aire antes del próximo;
          // con el jefe en pantalla, también.
          this.spawnTimer = this.spawnInterval * (0.7 + Math.random() * 0.6) * (1 + 0.12 * (units - 1))
            * (this.bossWave ? 1.5 : 1);
        }
      }
    }

    for (const e of this.enemies) {
      e.update(dt);
      if (e.alive && e.x - e.spec.radius <= DEFENSE_X) this.breach(e);
    }
    this.enemies = this.enemies.filter((e) => e.state !== 'dead');
    this.effects.update(dt);

    if (this.endTimer < 0 && !this.bossPending && this.waveSpawned >= this.waveTotal && this.enemies.length === 0) {
      this.clearWave();
    }
  }

  private draw() {
    const { ctx } = this.stage;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.drawImage(this.background, 0, 0, W, H);
    drawMist(ctx, this.time);
    drawDefenseLine(ctx, this.time);
    drawShrine(ctx, this.lives, MAX_LIVES, this.time);

    const target = this.target?.alive ? this.target : null;
    const candidates = this.candidates.filter((e) => e.alive);
    if (target) drawTargetLink(ctx, target, this.time);
    const opts = {
      isTarget: false,
      isCandidate: false,
      dimmed: target !== null || candidates.length > 0,
      showHint: this.config.showHints,
      showFurigana: this.config.showFurigana,
    };
    for (const e of this.enemies) {
      if (e !== target && !candidates.includes(e)) drawEnemy(ctx, e, this.time, opts);
    }
    for (const e of candidates) drawEnemy(ctx, e, this.time, { ...opts, isCandidate: true, dimmed: false });
    if (target) drawEnemy(ctx, target, this.time, { ...opts, isTarget: true, dimmed: false });

    this.effects.draw(ctx);
    ctx.restore();

    const spawnedTotal = this.waveTotal + (this.bossWave ? 1 : 0);
    const spawned = this.waveSpawned + (this.bossWave && !this.bossPending ? 1 : 0);
    drawHud(ctx, {
      score: this.score,
      wave: this.wave,
      totalWaves: this.config.totalWaves,
      waveProgress: spawnedTotal ? spawned / spawnedTotal : 0,
      combo: this.combo,
      multiplier: this.multiplier,
      kamikaze: this.kamikaze,
      time: this.time,
    });

    if (this.banner.time > 0) {
      const { time, duration } = this.banner;
      const alpha = Math.min(1, time / 0.4, (duration - time) / 0.3 + 0.01);
      drawBanner(ctx, this.banner.title, this.banner.sub, alpha);
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(6,5,16,0.5)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------------------------------------------------------- oleadas

  private get spawnInterval(): number {
    return Math.max(0.55, 2.1 - 0.13 * (this.wave - 1)) * this.diff.spawn;
  }

  private get baseSpeed(): number {
    return (52 + 7 * (this.wave - 1)) * this.diff.speed;
  }

  private get multiplier(): number {
    return Math.min(5, 1 + Math.floor(this.combo / 10));
  }

  private nextWave() {
    this.wave++;
    const total = this.config.totalWaves;
    const last = total !== null && this.wave === total;
    this.bossWave = last || (total === null && this.wave % BOSS_EVERY === 0);
    this.bossPending = this.bossWave;
    this.waveTotal = this.bossWave ? 4 + this.wave : 8 + this.wave * 2;
    this.waveSpawned = 0;
    this.spawnTimer = BANNER_SECONDS;
    this.livesAtWaveStart = this.lives;
    this.banner = {
      title: last ? 'Última oleada' : total ? `Oleada ${this.wave} de ${total}` : `Oleada ${this.wave}`,
      sub: `第${kanjiNumber(this.wave)}波`,
      time: BANNER_SECONDS,
      duration: BANNER_SECONDS,
    };
    sfx.waveStart();
    setMusicIntensity(this.wave);
  }

  private clearWave() {
    const perfect = this.lives === this.livesAtWaveStart;
    const bonus = 100 * this.wave * (perfect ? 2 : 1);
    this.score += bonus;
    this.effects.float(W / 2, 120, `${perfect ? '¡Oleada perfecta!' : '¡Oleada superada!'} +${bonus}`);
    if (this.config.totalWaves !== null && this.wave >= this.config.totalWaves) {
      this.victory = true;
      this.score += 500 * this.lives;
      this.endTimer = 3;
      this.banner = { title: '¡El santuario está a salvo!', sub: '勝利', time: 3, duration: 3 };
      sfx.victory();
      return;
    }
    sfx.waveClear();
    this.nextWave();
  }

  /** Qué tipo de yōkai aparece: los especiales se suman a medida que avanzan las oleadas. */
  private rollKind(): EnemyKind {
    const w = this.wave;
    const weights: [EnemyKind, number][] = [
      ['hitodama', 1],
      ['tengu', w >= 2 ? 0.2 + 0.03 * w : 0],
      ['oni', w >= 3 ? 0.1 + 0.02 * w : 0],
      ['kitsune', w >= 5 ? 0.18 : 0],
    ];
    let r = Math.random() * weights.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of weights) {
      r -= weight;
      if (r <= 0) return kind;
    }
    return 'hitodama';
  }

  private spawn(): Enemy {
    const kind = this.rollKind();
    const layers = kind === 'oni' ? (this.wave >= 8 ? 3 : 2) : 1;
    // Al tengu, que es rápido, le tocan cosas cortas si hay.
    const prefer = kind === 'tengu' ? (i: StudyItem) => [...i.reading].length <= 3 : undefined;
    const enemy = new Enemy(kind, this.pickItems(layers, prefer), W + 60, this.pickY(), 0);
    // Las palabras largas avanzan más lento para que haya tiempo de escribirlas.
    const lengthFactor = 1 / (1 + 0.08 * (enemy.matcher.units.length - 1));
    enemy.speed = this.baseSpeed * enemy.spec.speed * lengthFactor * (0.85 + Math.random() * 0.3);
    this.enemies.push(enemy);
    this.waveSpawned++;
    this.announce(kind);
    return enemy;
  }

  private spawnBoss() {
    this.bossPending = false;
    const layers = Math.min(14, 5 + Math.floor(this.wave / 2));
    const boss = new Enemy('boss', this.pickItems(layers), W + 100, (MIN_Y + MAX_Y) / 2 + 30, 0);
    boss.speed = this.baseSpeed * boss.spec.speed;
    this.enemies.push(boss);
    this.banner = { title: '¡Llega el Ōoni!', sub: '大鬼', time: BANNER_SECONDS, duration: BANNER_SECONDS };
    this.shake = 10;
    sfx.waveStart();
  }

  /** La primera vez que aparece un tipo de yōkai, se avisa qué hace. */
  private announce(kind: EnemyKind) {
    if (this.seenKinds.has(kind)) return;
    this.seenKinds.add(kind);
    this.effects.float(W / 2, 110, `¡Nuevo yōkai: ${KINDS[kind].name}!`, KINDS[kind].hint, '#ffd36b');
  }

  private pickItems(count: number, prefer?: (i: StudyItem) => boolean): StudyItem[] {
    return Array.from({ length: count }, () => this.pickItem(prefer));
  }

  /**
   * Sortea un grupo y después un ítem. En orden de prioridad evita: que empiece con una
   * letra que ya usa otro yōkai en pantalla (así la primera tecla no es ambigua), lo que
   * está en pantalla y lo que salió hace poco. Si no se puede cumplir todo, se va relajando.
   */
  private pickItem(prefer?: (i: StudyItem) => boolean): StudyItem {
    const alive = this.enemies.filter((e) => e.alive);
    const onScreen = new Set(this.enemies.flatMap((e) => e.items.map((i) => i.id)));
    const usedKeys = new Set(alive.flatMap((e) => [...firstKeys(e.item)]));
    const recent = new Set(this.recent.slice(-6));
    const notShown = (i: StudyItem) => !onScreen.has(i.id);
    const fresh = (i: StudyItem) => notShown(i) && !recent.has(i.id);
    const noClash = (i: StudyItem) => ![...firstKeys(i)].some((k) => usedKeys.has(k));
    const tiers = [
      (i: StudyItem) => fresh(i) && noClash(i),
      (i: StudyItem) => notShown(i) && noClash(i),
      fresh,
      notShown,
      () => true,
    ];

    // La preferencia del tipo de yōkai (ej. cosas cortas para el tengu) pesa menos que
    // evitar letras repetidas: se prueba en cada nivel antes de relajarlo.
    const all = this.config.pools.filter((p) => p.length > 0);
    const preferred = prefer ? all.map((p) => p.filter(prefer)).filter((p) => p.length > 0) : [];
    let pools = all;
    let filter = tiers[tiers.length - 1];
    search: for (const tier of tiers) {
      for (const option of [preferred, all]) {
        if (option.some((p) => p.some(tier))) {
          pools = option;
          filter = tier;
          break search;
        }
      }
    }
    const candidates = pools.filter((p) => p.some(filter));
    const pool = candidates[Math.floor(Math.random() * candidates.length)].filter(filter);
    const item = this.weightedPick(pool);
    this.recent.push(item.id);
    if (this.recent.length > 20) this.recent.shift();
    return item;
  }

  private weightedPick(pool: StudyItem[]): StudyItem {
    const { weightOf } = this.config;
    if (!weightOf) return pool[Math.floor(Math.random() * pool.length)];
    const weights = pool.map(weightOf);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /** Elige una altura lejos de los yōkai que acaban de aparecer. */
  private pickY(): number {
    const fresh = this.enemies.filter((e) => e.x > W - 450);
    let best = MIN_Y;
    let bestDist = -1;
    for (let i = 0; i < 8; i++) {
      const y = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
      const dist = Math.min(1000, ...fresh.map((e) => Math.abs(e.baseY - y)));
      if (dist > bestDist) {
        best = y;
        bestDist = dist;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- input

  private onBlur = () => this.setPaused(true);

  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || this.endTimer >= 0) return;
    if (e.key === 'Escape') {
      this.setPaused(!this.paused);
      return;
    }
    if (this.paused) {
      if (e.key.toLowerCase() === 'q') this.quit();
      return;
    }
    // Soltar el objetivo: Shift queda más a mano que Retroceso (se aceptan los dos).
    if (e.key === 'Shift' || e.key === 'Backspace') {
      e.preventDefault();
      if (!e.repeat) this.releaseTarget();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.unleashKamikaze();
      return;
    }
    const key = e.key.toLowerCase();
    if (!/^[a-z'-]$/.test(key)) return;
    e.preventDefault();
    this.handleChar(key);
  };

  /** Suelta el objetivo (o los candidatos) y descarta lo que se les había escrito. */
  private releaseTarget() {
    this.target?.matcher.reset();
    for (const c of this.candidates) c.matcher.reset();
    this.target = null;
    this.candidates = [];
  }

  private handleChar(key: string) {
    this.keystrokes++;
    if (this.target && !this.target.alive) this.target = null;
    this.candidates = this.candidates.filter((e) => e.alive);

    const target = this.target;
    if (target) {
      if (!target.matcher.type(key)) {
        this.mistake([target]);
        return;
      }
      this.correctKey(target);
      if (target.matcher.done) this.completeItem(target);
      else sfx.key();
      return;
    }

    // Sin objetivo fijo: la tecla avanza en todos los que la aceptan.
    const pool = this.candidates.length ? this.candidates : this.enemies.filter((e) => e.alive);
    const matching = pool.filter((e) => e.matcher.canType(key)).sort((a, b) => a.x - b.x);
    if (matching.length === 0) {
      this.mistake(this.candidates);
      return;
    }
    for (const e of this.candidates) if (!matching.includes(e)) e.matcher.reset();
    for (const e of matching) e.matcher.type(key);
    this.correctKey(matching[0]);

    // Si alguno ya quedó completo (か frente a かさ), gana el más cercano al santuario.
    const done = matching.find((e) => e.matcher.done);
    if (done) {
      for (const e of matching) if (e !== done) e.matcher.reset();
      this.candidates = [];
      this.target = done;
      this.completeItem(done);
      return;
    }
    if (matching.length === 1) {
      this.target = matching[0];
      this.candidates = [];
    } else {
      this.candidates = matching;
    }
    sfx.key();
  }

  private correctKey(e: Enemy) {
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += 10 * this.multiplier;
    this.effects.burst(e.x, e.y - e.spec.radius - 40, '#ffd36b', 4, 60);
  }

  /** Tecla equivocada: se marca en los yōkai a los que se estaba escribiendo. */
  private mistake(targets: Enemy[]) {
    this.errors++;
    this.combo = 0;
    this.shake = Math.max(this.shake, 3);
    sfx.error();
    for (const t of targets) t.errorFlash = 0.35;
    // El error se anota al más cercano (el más urgente).
    if (targets.length) {
      this.report(targets[0].item).errors++;
      targets[0].layerErrors++;
    }
  }

  /** Se terminó de escribir lo que lleva el yōkai: pierde una capa o es desterrado. */
  private completeItem(e: Enemy) {
    const { item, matcher } = e;
    this.score += 30 * matcher.units.length * this.multiplier;
    // Con kanji mostramos también la lectura en kana, que es lo que hay que aprender.
    const sub = item.script === 'kanji' ? `${matcher.reading} · ${item.meaning ?? ''}` : item.meaning ?? '';
    this.effects.float(e.x, e.y - e.spec.radius - 80, matcher.typed, sub);
    speak(item.spoken?.[matcher.pathIndex] ?? matcher.reading);
    this.encounters.push({ item, outcome: e.layerErrors > 0 ? 'errors' : 'clean' });
    this.chargeKamikaze(KAMIKAZE_PER_ITEM);

    if (e.nextItem()) {
      // Oni y jefe: al romper una capa se suelta el objetivo, así se puede seguir con
      // cualquier otro yōkai sin tener que apretar Shift.
      this.target = null;
      const { x, y } = e;
      this.effects.ofuda(SHRINE_ORIGIN.x, SHRINE_ORIGIN.y, x, y, () => this.effects.burst(x, y, '#fff3c4', 16, 180));
      sfx.layer();
      return;
    }
    this.target = null;
    this.banishEnemy(e);
    sfx.banish(this.combo);
  }

  private banishEnemy(e: Enemy) {
    e.banish();
    this.defeated++;
    const { x, y } = e;
    const isBoss = e.kind === 'boss';
    if (isBoss) {
      this.score += 1000 * this.wave;
      this.shake = 16;
      this.effects.float(W / 2, 160, `¡Ōoni derrotado! +${1000 * this.wave}`);
    }
    this.effects.ofuda(SHRINE_ORIGIN.x, SHRINE_ORIGIN.y, x, y, () => {
      this.effects.burst(x, y, '#9fe3ff', isBoss ? 120 : 26, isBoss ? 420 : 220);
      this.effects.burst(x, y, '#fff3c4', isBoss ? 50 : 10, isBoss ? 260 : 120);
    });
  }

  private chargeKamikaze(amount: number) {
    const wasReady = this.kamikaze >= 1;
    this.kamikaze = Math.min(1, this.kamikaze + amount);
    if (!wasReady && this.kamikaze >= 1) {
      sfx.ready();
      this.effects.float(W / 2, 110, '¡Kamikaze listo!', 'Enter para usarlo', '#ffd36b');
    }
  }

  /** 神風: destierra a todos los yōkai en pantalla; al jefe le quita una capa. */
  private unleashKamikaze() {
    if (this.kamikaze < 1) return;
    this.kamikaze = 0;
    this.releaseTarget();
    sfx.kamikaze();
    this.effects.wind(W, H);
    this.effects.float(W / 2, H / 2 - 40, '神風', '¡viento divino!', '#fff3c4');
    this.shake = 18;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.score += 20 * this.multiplier;
      if (e.kind === 'boss' && e.nextItem()) continue;
      this.banishEnemy(e);
    }
  }

  private breach(e: Enemy) {
    e.state = 'dead';
    if (this.target === e) this.target = null;
    this.candidates = this.candidates.filter((c) => c !== e);
    this.lives = Math.max(0, this.lives - (e.kind === 'boss' ? 2 : 1));
    this.combo = 0;
    this.shake = e.kind === 'boss' ? 24 : 14;
    this.report(e.item).escaped++;
    this.encounters.push({ item: e.item, outcome: 'escaped' });
    this.effects.burst(DEFENSE_X, e.y, '#c58bff', 30, 260);
    this.effects.float(DEFENSE_X + 80, e.y - 40, `${e.item.text} = ${canonicalRomaji(e.item.reading)}`, '', '#ff9d9d');
    if (this.lives <= 0) {
      this.endTimer = 2.5;
      this.banner = { title: 'El santuario cayó', sub: '鳥居が倒れた', time: 2.5, duration: 2.5 };
      for (const other of this.enemies) if (other.alive) other.banish();
      sfx.gameOver();
    } else {
      sfx.breach();
    }
  }

  private report(item: StudyItem): ItemReport {
    let r = this.reports.get(item.id);
    if (!r) {
      r = { item, errors: 0, escaped: 0 };
      this.reports.set(item.id, r);
    }
    return r;
  }

  private finish() {
    this.destroy();
    const struggles = [...this.reports.values()].sort((a, b) => b.escaped * 3 + b.errors - (a.escaped * 3 + a.errors));
    this.onEnd({
      victory: this.victory,
      score: this.score,
      wave: this.wave,
      totalWaves: this.config.totalWaves,
      defeated: this.defeated,
      keystrokes: this.keystrokes,
      errors: this.errors,
      maxCombo: this.maxCombo,
      seconds: this.time,
      livesLeft: this.lives,
      maxLives: MAX_LIVES,
      struggles,
      encounters: this.encounters,
    });
  }
}
