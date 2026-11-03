// Dibujo de cada tipo de yōkai, centrado en (x, y). Todos miran hacia la izquierda (al santuario).
import type { Enemy } from './enemy';

const TAU = Math.PI * 2;

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hitodama(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: number) {
  const flick = Math.sin(t * 9 + phase) * 5;
  const tipX = x + 58 + Math.sin(t * 5 + phase) * 4;
  const tipY = y - 12 + flick;
  glow(ctx, x, y, 52, 'rgba(120,210,255,0.45)');

  const body = ctx.createLinearGradient(x - 20, y, tipX, tipY);
  body.addColorStop(0, '#e9fbff');
  body.addColorStop(0.35, '#8fd8ff');
  body.addColorStop(1, 'rgba(70,120,255,0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.quadraticCurveTo(x + 28, y - 20, tipX, tipY);
  ctx.quadraticCurveTo(x + 30, y + 14, x, y + 20);
  ctx.arc(x, y, 20, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1a2440';
  ctx.beginPath();
  ctx.ellipse(x - 9, y - 3, 2.6, 4, 0, 0, TAU);
  ctx.ellipse(x + 2, y - 3, 2.6, 4, 0, 0, TAU);
  ctx.fill();
}

function tengu(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: number) {
  glow(ctx, x, y, 50, 'rgba(255,120,90,0.3)');
  // Alas que aletean
  const flap = Math.sin(t * 14 + phase) * 0.35;
  ctx.fillStyle = '#2d2440';
  for (const [dy, rot] of [[-8, -0.5 - flap], [8, 0.5 + flap]]) {
    ctx.beginPath();
    ctx.ellipse(x + 20, y + dy, 30, 11, rot, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#4a3d63';
  ctx.lineWidth = 2;
  for (const rot of [-0.5 - flap, 0.5 + flap]) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 8 + Math.cos(rot) * 40, y + Math.sin(rot) * 40);
    ctx.stroke();
  }
  // Cara roja con la nariz larga
  ctx.fillStyle = '#d8432f';
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c0362a';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 3);
  ctx.quadraticCurveTo(x - 30, y - 2, x - 40, y + 3);
  ctx.lineTo(x - 8, y + 6);
  ctx.closePath();
  ctx.fill();
  // Tokin (gorrito negro)
  ctx.fillStyle = '#141018';
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 17);
  ctx.lineTo(x, y - 30);
  ctx.lineTo(x + 7, y - 17);
  ctx.closePath();
  ctx.fill();
  // Cejas blancas, ojos y barba
  ctx.strokeStyle = '#f4efe6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 11);
  ctx.lineTo(x - 4, y - 7);
  ctx.moveTo(x + 2, y - 7);
  ctx.lineTo(x + 12, y - 11);
  ctx.stroke();
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  ctx.arc(x - 8, y - 3, 2.4, 0, TAU);
  ctx.arc(x + 6, y - 3, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f4efe6';
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 12);
  ctx.quadraticCurveTo(x, y + 30, x + 8, y + 12);
  ctx.closePath();
  ctx.fill();
}

function oniFace(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number,
  skin: string, horn: string, eye: string, t: number,
) {
  const s = r / 28;
  // Cuernos
  ctx.fillStyle = horn;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 10 * s, y - 20 * s);
    ctx.quadraticCurveTo(x + side * 22 * s, y - 36 * s, x + side * 18 * s, y - 48 * s);
    ctx.lineTo(x + side * 20 * s, y - 18 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Cabeza
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  // Pelo
  ctx.fillStyle = '#1b1426';
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, r, Math.PI * 1.08, Math.PI * 1.92);
  ctx.closePath();
  ctx.fill();
  // Cejas enojadas
  ctx.strokeStyle = '#1b1426';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(x - 17 * s, y - 12 * s);
  ctx.lineTo(x - 4 * s, y - 6 * s);
  ctx.moveTo(x + 4 * s, y - 6 * s);
  ctx.lineTo(x + 17 * s, y - 12 * s);
  ctx.stroke();
  // Ojos
  const blink = (t % 4) < 0.12 ? 0.2 : 1;
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.ellipse(x - 10 * s, y - 1 * s, 5 * s, 4 * s * blink, 0, 0, TAU);
  ctx.ellipse(x + 10 * s, y - 1 * s, 5 * s, 4 * s * blink, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#120c18';
  ctx.beginPath();
  ctx.arc(x - 12 * s, y - 1 * s, 2 * s * blink, 0, TAU);
  ctx.arc(x + 8 * s, y - 1 * s, 2 * s * blink, 0, TAU);
  ctx.fill();
  // Boca con colmillos
  ctx.fillStyle = '#2a0d14';
  ctx.beginPath();
  ctx.ellipse(x, y + 13 * s, 12 * s, 6 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f6efe0';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 8 * s, y + 17 * s);
    ctx.lineTo(x + side * 5 * s, y + 8 * s);
    ctx.lineTo(x + side * 2 * s, y + 17 * s);
    ctx.closePath();
    ctx.fill();
  }
}

/** Capas que le quedan a un oni o al jefe: pequeños ofudas debajo. */
function layerPips(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number) {
  const total = e.items.length;
  const size = e.kind === 'boss' ? 10 : 8;
  const gap = size + 4;
  const startX = x - ((total - 1) * gap) / 2;
  for (let i = 0; i < total; i++) {
    const on = i >= total - e.remaining;
    ctx.fillStyle = on ? '#f6efe0' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(startX + i * gap - size / 2, y, size, size * 1.4);
    if (on) {
      ctx.fillStyle = '#c23b2e';
      ctx.fillRect(startX + i * gap - 1, y + 2, 2, size * 1.4 - 4);
    }
  }
}

function oni(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, t: number) {
  glow(ctx, x, y, 60, 'rgba(120,130,255,0.3)');
  oniFace(ctx, x, y, 28, '#4d63c4', '#efe6cf', '#ffd84a', t + e.phase);
  layerPips(ctx, e, x, y + 34);
}

function boss(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, t: number) {
  const pulse = 0.35 + Math.sin(t * 3) * 0.1;
  glow(ctx, x, y, 150, `rgba(200,40,80,${pulse})`);
  oniFace(ctx, x, y, 62, '#b8322c', '#e8b33a', '#fff27a', t);
  // Corona dorada entre los cuernos
  ctx.fillStyle = '#e8b33a';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 52);
  ctx.lineTo(x - 10, y - 72);
  ctx.lineTo(x, y - 56);
  ctx.lineTo(x + 10, y - 72);
  ctx.lineTo(x + 18, y - 52);
  ctx.closePath();
  ctx.fill();
  layerPips(ctx, e, x, y + 72);
}

function kitsune(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: number) {
  // Kitsunebi: fuegos de zorro que orbitan
  for (let i = 0; i < 3; i++) {
    const a = t * 1.8 + phase + (i * TAU) / 3;
    const fx = x + Math.cos(a) * 34;
    const fy = y + Math.sin(a) * 20;
    glow(ctx, fx, fy, 14, 'rgba(255,170,60,0.8)');
  }
  glow(ctx, x, y, 48, 'rgba(255,200,140,0.25)');
  // Orejas
  ctx.fillStyle = '#f7f2ea';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 4, y - 14);
    ctx.lineTo(x + side * 16, y - 34);
    ctx.lineTo(x + side * 18, y - 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#d6333a';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 9, y - 15);
    ctx.lineTo(x + side * 15, y - 27);
    ctx.lineTo(x + side * 15, y - 12);
    ctx.closePath();
    ctx.fill();
  }
  // Máscara
  ctx.fillStyle = '#f7f2ea';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 10);
  ctx.quadraticCurveTo(x, y - 22, x + 18, y - 10);
  ctx.quadraticCurveTo(x + 14, y + 10, x, y + 22);
  ctx.quadraticCurveTo(x - 14, y + 10, x - 18, y - 10);
  ctx.fill();
  // Marcas rojas y ojos rasgados
  ctx.strokeStyle = '#d6333a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x - 14, y + 2);
  ctx.lineTo(x - 7, y + 6);
  ctx.moveTo(x + 14, y + 2);
  ctx.lineTo(x + 7, y + 6);
  ctx.stroke();
  ctx.strokeStyle = '#1a1020';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 6);
  ctx.lineTo(x - 5, y - 3);
  ctx.moveTo(x + 13, y - 6);
  ctx.lineTo(x + 5, y - 3);
  ctx.stroke();
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  ctx.arc(x, y + 18, 2.5, 0, TAU);
  ctx.fill();
}

export function drawYokai(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, t: number) {
  switch (e.kind) {
    case 'hitodama':
      return hitodama(ctx, x, y, t, e.phase);
    case 'tengu':
      return tengu(ctx, x, y, t, e.phase);
    case 'oni':
      return oni(ctx, e, x, y, t);
    case 'kitsune':
      return kitsune(ctx, x, y, t, e.phase);
    case 'boss':
      return boss(ctx, e, x, y, t);
  }
}
