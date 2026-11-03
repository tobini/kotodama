/** Resolución lógica del juego: todo se dibuja en estas coordenadas y se escala a la ventana. */
export const W = 1280;
export const H = 720;

export class Stage {
  readonly ctx: CanvasRenderingContext2D;
  onResize: (() => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  private resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const cssW = Math.floor(W * scale);
    const cssH = Math.floor(H * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    this.onResize?.();
  };
}
