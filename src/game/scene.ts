import { W, H } from './stage';
import { KANA_FONT, UI_FONT } from './fonts';
import type { Enemy } from './enemy';
import { drawYokai } from './yokai';

const TAU = Math.PI * 2;

export const GROUND_Y = 650;
/** Si un yōkai cruza esta línea, alcanza el santuario. */
export const DEFENSE_X = 215;
/** Desde donde salen los ofudas. */
export const SHRINE_ORIGIN = { x: 104, y: 270 };

const TORII_RED = '#c23b2e';
const TORII_DARK = '#8e2a22';
const TORII_BLACK = '#17121f';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hills(ctx: CanvasRenderingContext2D, base: number, amp: number, freq: number, seed: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = base + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed * 3) * amp * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function cedars(ctx: CanvasRenderingContext2D, rnd: () => number, base: number, count: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = 260 + rnd() * (W - 260);
    const h = 40 + rnd() * 50;
    const w = h * 0.32;
    ctx.beginPath();
    ctx.moveTo(x, base - h);
    ctx.lineTo(x + w, base + 4);
    ctx.lineTo(x - w, base + 4);
    ctx.closePath();
    ctx.fill();
  }
}

/** Fondo estático (cielo, luna, montañas). Se dibuja una vez a doble resolución. */
export function buildBackground(): HTMLCanvasElement {
  const S = 2;
  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const ctx = c.getContext('2d')!;
  ctx.scale(S, S);
  const rnd = mulberry32(7);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#060a22');
  sky.addColorStop(0.55, '#1b1940');
  sky.addColorStop(1, '#3a2550');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,252,235,${0.25 + rnd() * 0.6})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H * 0.6, 0.3 + rnd() * 1.2, 0, TAU);
    ctx.fill();
  }

  // Luna
  const mx = 1060;
  const my = 135;
  const glow = ctx.createRadialGradient(mx, my, 40, mx, my, 220);
  glow.addColorStop(0, 'rgba(255,228,175,0.28)');
  glow.addColorStop(1, 'rgba(255,228,175,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 220, my - 220, 440, 440);
  ctx.fillStyle = '#f6ecd0';
  ctx.beginPath();
  ctx.arc(mx, my, 52, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,185,150,0.35)';
  for (const [dx, dy, r] of [[-14, -10, 10], [16, 8, 7], [-4, 20, 6], [20, -18, 5]]) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, r, 0, TAU);
    ctx.fill();
  }

  // Monte Fuji
  ctx.fillStyle = '#2f2760';
  ctx.beginPath();
  ctx.moveTo(540, GROUND_Y - 40);
  ctx.lineTo(820, 300);
  ctx.quadraticCurveTo(850, 288, 880, 300);
  ctx.lineTo(1190, GROUND_Y - 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6d0e8';
  ctx.beginPath();
  ctx.moveTo(820, 300);
  ctx.quadraticCurveTo(850, 288, 880, 300);
  ctx.lineTo(907, 328);
  ctx.lineTo(889, 320);
  ctx.lineTo(874, 336);
  ctx.lineTo(857, 321);
  ctx.lineTo(840, 337);
  ctx.lineTo(824, 322);
  ctx.lineTo(798, 330);
  ctx.closePath();
  ctx.fill();

  hills(ctx, 560, 26, 0.006, 1.3, '#1c1638');
  cedars(ctx, rnd, 575, 22, '#17122f');
  hills(ctx, 612, 18, 0.009, 4.1, '#120e27');
  cedars(ctx, rnd, 625, 14, '#0f0b20');

  ctx.fillStyle = '#0c0a1b';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 230; x < W; x += 70) ctx.fillRect(x + rnd() * 20, GROUND_Y + 18 + rnd() * 30, 30 + rnd() * 25, 4);

  return c;
}

export function drawMist(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const x = ((t * (8 + i * 4) + i * 420) % (W + 600)) - 300;
    const y = 470 + i * 45;
    const g = ctx.createRadialGradient(x, y, 10, x, y, 260);
    g.addColorStop(0, 'rgba(190,190,240,0.07)');
    g.addColorStop(1, 'rgba(190,190,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 260, y - 260, 520, 520);
  }
  ctx.restore();
}

export function drawDefenseLine(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,220,150,${0.18 + 0.08 * Math.sin(t * 2)})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(DEFENSE_X, 100);
  ctx.lineTo(DEFENSE_X, GROUND_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Shide: tiras de papel en zigzag
  ctx.strokeStyle = 'rgba(250,245,230,0.5)';
  ctx.lineWidth = 3;
  for (let y = 150; y < GROUND_Y - 20; y += 110) {
    const sway = Math.sin(t * 1.5 + y) * 2;
    ctx.beginPath();
    ctx.moveTo(DEFENSE_X, y);
    ctx.lineTo(DEFENSE_X + 7 + sway, y + 7);
    ctx.lineTo(DEFENSE_X + sway, y + 14);
    ctx.lineTo(DEFENSE_X + 7 + sway, y + 21);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawShrine(ctx: CanvasRenderingContext2D, lives: number, maxLives: number, t: number) {
  // Postes
  ctx.fillStyle = TORII_RED;
  ctx.fillRect(52, 250, 18, GROUND_Y - 250);
  ctx.fillRect(138, 250, 18, GROUND_Y - 250);
  ctx.fillStyle = TORII_DARK;
  ctx.fillRect(64, 250, 6, GROUND_Y - 250);
  ctx.fillRect(150, 250, 6, GROUND_Y - 250);
  ctx.fillStyle = TORII_BLACK;
  ctx.fillRect(47, GROUND_Y - 18, 28, 18);
  ctx.fillRect(133, GROUND_Y - 18, 28, 18);

  // Nuki (travesaño inferior) y gakuzuka
  ctx.fillStyle = TORII_RED;
  ctx.fillRect(30, 292, 148, 14);
  ctx.fillStyle = TORII_DARK;
  ctx.fillRect(98, 262, 12, 30);

  // Kasagi (travesaño superior curvo)
  ctx.fillStyle = TORII_RED;
  ctx.beginPath();
  ctx.moveTo(16, 240);
  ctx.quadraticCurveTo(104, 256, 192, 240);
  ctx.lineTo(188, 262);
  ctx.quadraticCurveTo(104, 272, 20, 262);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TORII_BLACK;
  ctx.beginPath();
  ctx.moveTo(6, 226);
  ctx.quadraticCurveTo(104, 248, 202, 226);
  ctx.lineTo(196, 242);
  ctx.quadraticCurveTo(104, 260, 12, 242);
  ctx.closePath();
  ctx.fill();

  // Faroles (vidas)
  const spacing = maxLives > 1 ? Math.min(22, 60 / (maxLives - 1)) : 0;
  for (let i = 0; i < maxLives; i++) {
    const x = 104 + (i - (maxLives - 1) / 2) * spacing;
    const lit = i < lives;
    const sway = Math.sin(t * 1.8 + i) * 1.5;
    const ly = 340;
    ctx.strokeStyle = '#2a2230';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 306);
    ctx.lineTo(x + sway, ly - 14);
    ctx.stroke();
    if (lit) {
      const flicker = 0.85 + Math.sin(t * 9 + i * 2) * 0.08 + Math.random() * 0.05;
      const g = ctx.createRadialGradient(x + sway, ly, 2, x + sway, ly, 42);
      g.addColorStop(0, `rgba(255,150,70,${0.55 * flicker})`);
      g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + sway - 42, ly - 42, 84, 84);
    }
    ctx.fillStyle = lit ? '#e2552d' : '#3a3040';
    ctx.beginPath();
    ctx.ellipse(x + sway, ly, 9, 14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = TORII_BLACK;
    ctx.fillRect(x + sway - 6, ly - 15, 12, 3);
    ctx.fillRect(x + sway - 6, ly + 12, 12, 3);
  }
}

export interface EnemyDrawOptions {
  isTarget: boolean;
  /** Uno de varios yōkai que coinciden con lo escrito hasta ahora. */
  isCandidate: boolean;
  /** Hay otro yōkai fijado como objetivo: este se atenúa para que el objetivo resalte. */
  dimmed: boolean;
  showHint: boolean;
  showFurigana: boolean;
}

const GOLD = '#e8b33a';

/** Hilo dorado del santuario al objetivo: deja claro a quién le estás escribiendo. */
export function drawTargetLink(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(232,179,58,0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -t * 60;
  ctx.beginPath();
  ctx.moveTo(SHRINE_ORIGIN.x, SHRINE_ORIGIN.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  ctx.restore();
}

/** Mira giratoria alrededor del objetivo. */
function drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 12;
  const radius = r + 14 + Math.sin(t * 6) * 2;
  for (let i = 0; i < 4; i++) {
    const a = t * 1.5 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, a, a + 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number, opts: EnemyDrawOptions) {
  const { x } = e;
  const y = e.y;
  const r = e.spec.radius;
  const banished = e.state === 'banished';
  ctx.save();
  if (banished) {
    ctx.globalAlpha = 1 - e.fade;
    ctx.translate(x, y);
    ctx.scale(1 + e.fade * 0.6, 1 + e.fade * 0.6);
    ctx.translate(-x, -y);
  }
  if (opts.isTarget && !banished) drawReticle(ctx, x, y, r, t);
  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = e.hitFlash / 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  drawYokai(ctx, e, x, y, t);
  if (!banished) {
    // Atenuación leve: el objetivo resalta, pero los demás se siguen leyendo bien.
    ctx.globalAlpha = e.labelAlpha * (opts.dimmed ? 0.88 : 1);
    drawLabel(ctx, e, x, y, r, opts, t);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const INK = '#1d1a2b';
const STAMP = '#c23b2e';
const FURIGANA_HIDDEN = 'rgba(29,26,43,0.18)';

function drawLabel(
  ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, r: number, opts: EnemyDrawOptions, t: number,
) {
  const { units, completedUnits } = e.matcher;
  const lit = opts.isTarget || opts.isCandidate;
  const isKanji = e.item.script === 'kanji';

  // Kana: cada unidad se pinta de rojo al completarla. Kanji: el texto queda fijo y
  // la lectura (furigana) aparece arriba a medida que se escribe.
  ctx.font = `600 38px ${KANA_FONT}`;
  const mainText = isKanji ? [e.item.text] : units.map((u) => u.kana);
  const widths = mainText.map((text) => ctx.measureText(text).width);
  const textW = widths.reduce((a, b) => a + b, 0);

  ctx.font = `600 16px ${KANA_FONT}`;
  const furiWidths = isKanji ? units.map((u) => ctx.measureText(u.kana).width) : [];
  const furiW = furiWidths.reduce((a, b) => a + b, 0);

  const padX = 14;
  const furiH = isKanji ? 20 : 0;
  const w = Math.max(56, Math.max(textW, furiW) + padX * 2);
  const h = 54 + furiH;
  const x0 = x - w / 2;
  const y0 = y - r - 16 - h;

  ctx.shadowColor = lit ? 'rgba(232,179,58,0.9)' : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = lit ? 22 : 10;
  ctx.fillStyle = lit ? '#fffaf0' : 'rgba(246,240,226,0.93)';
  roundRect(ctx, x0, y0, w, h, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (e.errorFlash > 0) {
    ctx.strokeStyle = `rgba(230,50,50,${Math.min(1, e.errorFlash * 4)})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  } else if (lit) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Flechita que rebota sobre el objetivo
  if (lit) {
    const ay = y0 - 10 + Math.sin(t * 8) * 3;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(x - 9, ay - 8);
    ctx.lineTo(x + 9, ay - 8);
    ctx.lineTo(x, ay + 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // En un kanji suelto hay varias lecturas válidas: no mostramos pistas hasta que se empieza a escribir.
  const anyReading = e.item.kind === 'kanji' && !e.matcher.typed;
  if (isKanji && !anyReading) {
    let fx = x - furiW / 2;
    const fy = y0 + 14;
    ctx.font = `600 16px ${KANA_FONT}`;
    units.forEach((u, i) => {
      if (i < completedUnits) ctx.fillStyle = STAMP;
      else ctx.fillStyle = opts.showFurigana ? '#7a7286' : FURIGANA_HIDDEN;
      // Sin furigana, lo que falta se muestra como puntitos para no revelar la lectura.
      ctx.fillText(i < completedUnits || opts.showFurigana ? u.kana : '・'.repeat([...u.kana].length), fx, fy);
      fx += furiWidths[i];
    });
  }

  ctx.font = `600 38px ${KANA_FONT}`;
  let cx = x - textW / 2;
  mainText.forEach((text, i) => {
    const done = isKanji ? e.matcher.done : i < completedUnits;
    ctx.fillStyle = done ? STAMP : INK;
    ctx.fillText(text, cx, y0 + furiH + 54 / 2 + 2);
    cx += widths[i];
  });

  // Romaji escrito (y la pista, si está activada) debajo del yōkai
  const typed = e.matcher.typed;
  const hint = opts.showHint ? e.matcher.remainingHint() : '';
  if (typed || hint) {
    const size = lit ? 22 : 18;
    ctx.font = `700 ${size}px ${UI_FONT}`;
    const tw = ctx.measureText(typed).width;
    const hw = ctx.measureText(hint).width;
    let rx = x - (tw + hw) / 2;
    const ry = y + r + (e.kind === 'oni' || e.kind === 'boss' ? 38 : 14);
    ctx.fillStyle = lit ? 'rgba(10,8,25,0.85)' : 'rgba(10,8,25,0.6)';
    roundRect(ctx, rx - 7, ry - size * 0.7, tw + hw + 14, size * 1.4, 5);
    ctx.fill();
    if (lit) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd36b';
    ctx.fillText(typed, rx, ry);
    rx += tw;
    ctx.fillStyle = 'rgba(220,215,240,0.7)';
    ctx.fillText(hint, rx, ry);
  }
  ctx.textBaseline = 'alphabetic';
}

export interface HudState {
  score: number;
  wave: number;
  totalWaves: number | null;
  waveProgress: number;
  combo: number;
  multiplier: number;
  /** Carga del kamikaze, 0..1. */
  kamikaze: number;
  time: number;
}

export function drawHud(ctx: CanvasRenderingContext2D, s: HudState) {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `500 14px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('PUNTOS', 24, 18);
  ctx.textAlign = 'center';
  ctx.fillText(s.totalWaves ? `OLEADA ${s.wave} / ${s.totalWaves}` : `OLEADA ${s.wave} · INFINITO`, W / 2, 18);
  ctx.textAlign = 'right';
  ctx.fillText('COMBO', W - 24, 18);

  ctx.fillStyle = '#fdf3dc';
  ctx.font = `700 30px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(s.score.toLocaleString('es-AR'), 24, 36);
  ctx.textAlign = 'right';
  ctx.fillText(s.multiplier > 1 ? `${s.combo}  ×${s.multiplier}` : `${s.combo}`, W - 24, 36);

  // Barra de progreso de la oleada
  const bw = 220;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(W / 2 - bw / 2, 42, bw, 6);
  ctx.fillStyle = '#e8b33a';
  ctx.fillRect(W / 2 - bw / 2, 42, bw * s.waveProgress, 6);
  ctx.restore();
  drawKamikazeGauge(ctx, s.kamikaze, s.time);
}

/** Medidor del kamikaze (神風), en el suelo frente al santuario. */
function drawKamikazeGauge(ctx: CanvasRenderingContext2D, charge: number, t: number) {
  const x = 24;
  const y = GROUND_Y + 30;
  const w = 180;
  const ready = charge >= 1;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = `600 22px ${KANA_FONT}`;
  ctx.fillStyle = ready ? GOLD : 'rgba(255,255,255,0.6)';
  ctx.fillText('神風', x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, x + 54, y - 6, w, 12, 6);
  ctx.fill();
  if (charge > 0) {
    ctx.fillStyle = ready ? GOLD : '#9fe3ff';
    if (ready) {
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 10 + Math.sin(t * 6) * 6;
    }
    roundRect(ctx, x + 54, y - 6, w * Math.min(1, charge), 12, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (ready) {
    ctx.font = `700 15px ${UI_FONT}`;
    ctx.fillStyle = `rgba(253,243,220,${0.7 + Math.sin(t * 6) * 0.3})`;
    ctx.fillText('Enter: ¡kamikaze!', x + 54 + w + 14, y);
  }
  ctx.restore();
}

export function drawBanner(ctx: CanvasRenderingContext2D, title: string, sub: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(8,6,20,0.55)';
  ctx.fillRect(0, H / 2 - 70, W, 140);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fdf3dc';
  ctx.font = `700 52px ${UI_FONT}`;
  ctx.fillText(title, W / 2, H / 2 - 12);
  if (sub) {
    ctx.fillStyle = '#e8b33a';
    ctx.font = `600 24px ${KANA_FONT}`;
    ctx.fillText(sub, W / 2, H / 2 + 38);
  }
  ctx.restore();
}
