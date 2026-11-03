import './style.css';
import { loadFonts } from './game/fonts';
import { Game } from './game/game';
import { buildBackground, drawDefenseLine, drawMist, drawShrine } from './game/scene';
import { H, Stage, W } from './game/stage';
import { playMusic, unlockAudio } from './audio/music';
import { ALL_ITEMS, groupsForIds } from './data';
import type { StudyItem } from './data/types';
import { CAMPAIGN_WAVES, LEVELS, levelStars, saveLevelResult, starsFor } from './progress/campaign';
import { recordEncounters, reviewWeight, statsOf, weakestItems } from './progress/stats';
import { WAVES_PER_GAME, loadSettings, saveSettings } from './settings';
import { showMenu, type MenuAction } from './ui/menu';
import { showPause } from './ui/pause';
import { showResults, type ResultsExtras } from './ui/results';
import { applyVolumes } from './ui/volume';

const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const background = buildBackground();

let settings = loadSettings();
let unmount: (() => void) | null = null;
let idleFrame = 0;

/** Escena animada de fondo mientras se muestran los menús. */
function startIdle() {
  const start = performance.now();
  const loop = (now: number) => {
    const t = (now - start) / 1000;
    const { ctx } = stage;
    ctx.drawImage(background, 0, 0, W, H);
    drawMist(ctx, t);
    drawDefenseLine(ctx, t);
    drawShrine(ctx, 3, 3, t);
    ctx.fillStyle = 'rgba(6,5,16,0.45)';
    ctx.fillRect(0, 0, W, H);
    idleFrame = requestAnimationFrame(loop);
  };
  idleFrame = requestAnimationFrame(loop);
}

function stopIdle() {
  cancelAnimationFrame(idleFrame);
}

function toMenu() {
  unmount?.();
  startIdle();
  playMusic('calma');
  unmount = showMenu(overlay, settings, (s, action) => {
    settings = s;
    saveSettings(s);
    play(action);
  });
}

/** Qué se juega y cuántas oleadas según lo elegido en el menú. */
function gameContent(action: MenuAction): { pools: StudyItem[][]; totalWaves: number | null } {
  switch (action.kind) {
    case 'practice':
      return {
        pools: groupsForIds(settings.groups).map((g) => g.items),
        totalWaves: settings.mode === 'partida' ? WAVES_PER_GAME : null,
      };
    case 'level':
      return { pools: groupsForIds(action.level.groups).map((g) => g.items), totalWaves: CAMPAIGN_WAVES };
    case 'review': {
      // Si al reintentar ya no queda nada débil, se repasa todo lo que ya apareció alguna vez.
      const weak = weakestItems(ALL_ITEMS);
      const seen = ALL_ITEMS.filter((i) => statsOf(i.id));
      return { pools: [weak.length ? weak : seen.length ? seen : ALL_ITEMS], totalWaves: CAMPAIGN_WAVES };
    }
  }
}

function play(action: MenuAction) {
  const s = settings;
  unmount?.();
  unmount = null;
  stopIdle();
  applyVolumes(s.volumes);
  playMusic('batalla');
  const game = new Game(stage, background, {
    ...gameContent(action),
    showHints: s.showHints,
    showFurigana: s.showFurigana,
    difficulty: s.difficulty,
    weightOf: s.smartReview ? reviewWeight : undefined,
    // Solo en desarrollo: ?oleada=N arranca en esa oleada para probar.
    startWave: import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('oleada')) || 1 : 1,
    onPauseChange: (paused) => {
      unmount?.();
      unmount = paused
        ? showPause(overlay, settings.volumes, {
          onResume: () => game.setPaused(false),
          onQuit: () => game.quit(),
          onVolumes: (volumes) => {
            settings = { ...settings, volumes };
            saveSettings(settings);
          },
        })
        : null;
    },
  }, (result) => {
    unmount?.();
    startIdle();
    playMusic('calma');
    const extras: ResultsExtras = { newlyMastered: recordEncounters(result.encounters) };
    let onNext: (() => void) | undefined;
    if (action.kind === 'level') {
      const stars = starsFor(result);
      const record = stars > levelStars(action.level.id);
      saveLevelResult(action.level.id, stars);
      extras.campaign = { level: action.level, stars, record };
      const next = LEVELS[LEVELS.indexOf(action.level) + 1];
      if (next && levelStars(action.level.id) > 0) onNext = () => play({ kind: 'level', level: next });
    }
    unmount = showResults(overlay, result, extras, { onRetry: () => play(action), onMenu: toMenu, onNext });
  });
  game.start();
}

// El audio solo puede arrancar después de una interacción del usuario.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, unlockAudio, { once: true });
}
applyVolumes(settings.volumes);

loadFonts().then(toMenu);
