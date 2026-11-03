import { KANA_FONT, UI_FONT } from './fonts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  sub: string;
  color: string;
  life: number;
  max: number;
}

interface Projectile {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  onHit: () => void;
}

const PROJECTILE_SECONDS = 0.16;

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
  delay: number;
}

/** Partículas, textos flotantes y ofudas (talismanes) en vuelo. */
export class Effects {
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private projectiles: Projectile[] = [];
  private streaks: Streak[] = [];

  burst(x: number, y: number, color: string, count = 18, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const max = 0.4 + Math.random() * 0.5;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.5 + Math.random() * 3, color,
      });
    }
  }

  float(x: number, y: number, text: string, sub = '', color = '#ffe9a8') {
    this.floats.push({ x, y, text, sub, color, life: 1.4, max: 1.4 });
  }

  ofuda(fromX: number, fromY: number, toX: number, toY: number, onHit: () => void) {
    this.projectiles.push({ fromX, fromY, toX, toY, t: 0, onHit });
  }

  /** Ráfaga de viento divino que cruza la pantalla (kamikaze). */
  wind(width: number, height: number) {
    for (let i = 0; i < 70; i++) {
      this.streaks.push({
        x: -200 - Math.random() * 400,
        y: Math.random() * height,
        len: 120 + Math.random() * 260,
        speed: width * (1.6 + Math.random() * 1.2),
        delay: Math.random() * 0.35,
      });
    }
  }

  update(dt: number) {
    for (const s of this.streaks) {
      if (s.delay > 0) s.delay -= dt;
      else s.x += s.speed * dt;
    }
    this.streaks = this.streaks.filter((s) => s.x < 1600);

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 - 20 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 28 * dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    for (const p of this.projectiles) {
      p.t += dt / PROJECTILE_SECONDS;
      if (p.t >= 1) p.onHit();
    }
    this.projectiles = this.projectiles.filter((p) => p.t < 1);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.streaks.length) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const s of this.streaks) {
        if (s.delay > 0) continue;
        const g = ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,250,235,0.85)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2 + (s.len / 380) * 3;
        ctx.beginPath();
        ctx.moveTo(s.x - s.len, s.y + 18);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const p of this.projectiles) {
      const x = p.fromX + (p.toX - p.fromX) * p.t;
      const y = p.fromY + (p.toY - p.fromY) * p.t;
      const angle = Math.atan2(p.toY - p.fromY, p.toX - p.fromX);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + p.t * 6);
      ctx.fillStyle = '#fdf6e3';
      ctx.fillRect(-11, -5, 22, 10);
      ctx.fillStyle = '#c23b2e';
      ctx.fillRect(-7, -1.5, 14, 3);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.5));
      ctx.fillStyle = f.color;
      ctx.font = `700 26px ${UI_FONT}`;
      ctx.fillText(f.text, f.x, f.y);
      if (f.sub) {
        ctx.font = `600 20px ${KANA_FONT}`;
        ctx.fillStyle = '#e8e2f5';
        ctx.fillText(f.sub, f.x, f.y + 24);
      }
    }
    ctx.restore();
  }
}
