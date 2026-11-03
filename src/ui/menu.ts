import { SECTIONS, groupsForIds, type Section } from '../data';
import type { ItemGroup } from '../data/types';
import type { Difficulty } from '../game/game';
import {
  CAMPAIGN_WAVES, LEVELS, TRACKS, isUnlocked, levelItems, levelStars, nextInTrack, type CampaignLevel, type Track,
} from '../progress/campaign';
import { masteryOf } from '../progress/stats';
import { WAVES_PER_GAME, saveSettings, type GameMode, type MenuTab, type Settings, type Volumes } from '../settings';
import { bindProgressTab, progressTab } from './progress';
import { bindVolumeControls, volumeControls } from './volume';

export type MenuAction =
  | { kind: 'practice' }
  | { kind: 'level'; level: CampaignLevel }
  | { kind: 'review' };

const TABS: { id: MenuTab; name: string; jp: string }[] = [
  { id: 'campana', name: 'Campaña', jp: '道' },
  { id: 'practica', name: 'Práctica libre', jp: '練習' },
  { id: 'progreso', name: 'Progreso', jp: '進歩' },
];

const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: 'facil', name: 'Fácil' },
  { id: 'normal', name: 'Normal' },
  { id: 'dificil', name: 'Difícil' },
];

const MODES: { id: GameMode; name: string }[] = [
  { id: 'partida', name: `${WAVES_PER_GAME} oleadas` },
  { id: 'infinito', name: 'Infinito' },
];

// ---------------------------------------------------------------- práctica libre

function groupChip(group: ItemGroup, checked: boolean): string {
  const isWords = group.items[0]?.kind === 'word';
  const kana = group.items.map((i) => i.text);
  const top = isWords ? group.name : kana.length > 5 ? `${kana.slice(0, 4).join(' ')} …` : kana.join(' ');
  const bottom = isWords ? `${kana.length} palabras · ${kana.slice(0, 2).join('、')}…` : group.name;
  return `
    <label class="chip ${isWords ? 'words' : ''}">
      <input type="checkbox" name="group" value="${group.id}" ${checked ? 'checked' : ''} />
      <span><span class="${isWords ? 'name' : 'kana'}">${top}</span><span class="label">${bottom}</span></span>
    </label>`;
}

function section(s: Section, selected: Set<string>): string {
  const open = s.groups.some((g) => selected.has(g.id));
  return `
    <details class="section" ${open ? 'open' : ''}>
      <summary>
        <span class="section-title">${s.title} <span class="jp">${s.jp}</span></span>
        <span class="section-count" data-count="${s.key}"></span>
        <span class="actions">
          <button type="button" class="link-btn" data-all="${s.key}">todos</button>
          <button type="button" class="link-btn" data-none="${s.key}">ninguno</button>
        </span>
      </summary>
      <div class="chips">${s.groups.map((g) => groupChip(g, selected.has(g.id))).join('')}</div>
    </details>`;
}

function choice(name: string, label: string, options: { id: string; name: string }[], current: string): string {
  return `
    <div class="chips">
      ${options.map((o) => `
        <label class="chip">
          <input type="radio" name="${name}" value="${o.id}" ${current === o.id ? 'checked' : ''} />
          <span><span class="label">${label}</span>${o.name}</span>
        </label>`).join('')}
    </div>`;
}

function toggle(name: string, label: string, text: string, checked: boolean): string {
  return `
    <label class="chip">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} />
      <span><span class="label">${label}</span>${text}</span>
    </label>`;
}

// ---------------------------------------------------------------- campaña

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

/** Nivel que se juega con el botón principal: el próximo de cada camino, en orden. */
function suggestedLevel(): CampaignLevel {
  for (const track of TRACKS) {
    const next = nextInTrack(track.id);
    if (next) return next;
  }
  return LEVELS[LEVELS.length - 1];
}

function masteredPercent(level: CampaignLevel): number {
  const items = levelItems(level);
  if (items.length === 0) return 0;
  return Math.round((items.filter((i) => masteryOf(i.id) === 'mastered').length / items.length) * 100);
}

function trackRequirement(track: Track): string {
  const names = track.requires.map((id) => {
    const level = LEVELS.find((l) => l.id === id)!;
    const trackName = TRACKS.find((t) => t.id === level.track)!.name;
    return `<b>${level.title}</b> (${trackName})`;
  });
  return `Se desbloquea al ganar ${names.join(' y ')}.`;
}

function campaignTab(): string {
  return TRACKS.map((track) => {
    const levels = LEVELS.filter((l) => l.track === track.id);
    const next = nextInTrack(track.id);
    const won = levels.filter((l) => levelStars(l.id) > 0).length;
    const locked = !isUnlocked(levels[0]);
    return `
      <section class="track ${locked ? 'locked' : ''}">
        <h3 class="chapter">
          <span class="track-jp">${track.jp}</span> ${track.name}
          <span class="track-count">${won}/${levels.length}</span>
        </h3>
        <p class="track-desc">${locked ? trackRequirement(track) : track.description}</p>
        <div class="levels">
          ${levels.map((level, index) => {
            const unlocked = isUnlocked(level);
            const mastered = masteredPercent(level);
            return `
              <button type="button" class="level ${unlocked ? '' : 'locked'} ${level === next ? 'current' : ''}"
                data-level="${level.id}" ${unlocked ? '' : 'disabled'}>
                <span class="level-num">${index + 1}</span>
                <span class="level-jp">${level.jp}</span>
                <span class="level-title">${level.title}</span>
                <span class="level-stars">${unlocked ? stars(levelStars(level.id)) : 'Bloqueado'}</span>
                <span class="level-bar" title="${mastered}% dominado"><span style="width:${mastered}%"></span></span>
              </button>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
}

// ---------------------------------------------------------------- menú

/** Muestra el menú principal. Devuelve una función para desmontarlo. */
export function showMenu(
  root: HTMLElement,
  settings: Settings,
  onStart: (s: Settings, action: MenuAction) => void,
): () => void {
  const selected = new Set(settings.groups);
  let volumes: Volumes = { ...settings.volumes };
  let tab: MenuTab = settings.tab;

  root.innerHTML = `
    <form class="panel" id="menu">
      <div class="title"><h1>言霊</h1><span class="name">Kotodama</span></div>
      <p class="subtitle">Los yōkai se acercan al santuario. Desterralos escribiendo en romaji lo que llevan.</p>

      <nav class="tabs" role="tablist">
        ${TABS.map((t) => `
          <button type="button" role="tab" class="tab" data-tab="${t.id}">
            <span class="tab-jp">${t.jp}</span>${t.name}
          </button>`).join('')}
      </nav>

      <div data-panel="campana">
        <p class="tab-intro">Hiragana y katakana se pueden aprender en paralelo; kanji se abre cuando conocés los dos.
          Cada nivel tiene ${CAMPAIGN_WAVES} oleadas y un jefe: ganalo para desbloquear el siguiente del camino.
          La barra muestra cuánto de su contenido ya dominás.</p>
        ${campaignTab()}
      </div>

      <div data-panel="practica">
        <p class="tab-intro">Elegí exactamente qué practicar.</p>
        ${SECTIONS.map((s) => section(s, selected)).join('')}
        <h2>Partida</h2>
        <div class="options">${choice('mode', 'Partida', MODES, settings.mode)}</div>
      </div>

      <div data-panel="progreso">${progressTab()}</div>

      <div data-options>
        <h2>Opciones</h2>
        <div class="options">
          ${choice('difficulty', 'Dificultad', DIFFICULTIES, settings.difficulty)}
          ${toggle('hints', 'Ayuda', 'Mostrar romaji', settings.showHints)}
          ${toggle('furigana', 'Ayuda', 'Furigana en kanji', settings.showFurigana)}
          ${toggle('smart', 'Repaso', 'Más de lo que fallás', settings.smartReview)}
        </div>
        <h2>Volumen</h2>
        ${volumeControls(volumes)}
      </div>

      <div class="footer">
        <div class="help">
          Escribí el romaji · <kbd>Shift</kbd> cambia de objetivo · <kbd>Enter</kbd> kamikaze · <kbd>Esc</kbd> pausa
          <div class="count" id="count"></div>
        </div>
        <button class="btn" type="submit" id="start">Comenzar</button>
      </div>
    </form>`;

  const form = root.querySelector<HTMLFormElement>('#menu')!;
  const count = root.querySelector<HTMLElement>('#count')!;
  const start = root.querySelector<HTMLButtonElement>('#start')!;
  const checked = (name: string) => form.querySelector<HTMLInputElement>(`input[name=${name}]`)!.checked;
  const radio = (name: string) => form.querySelector<HTMLInputElement>(`input[name=${name}]:checked`)!.value;

  const read = (): Settings => ({
    groups: [...form.querySelectorAll<HTMLInputElement>('input[name=group]:checked')].map((i) => i.value),
    difficulty: radio('difficulty') as Difficulty,
    mode: radio('mode') as GameMode,
    showHints: checked('hints'),
    showFurigana: checked('furigana'),
    smartReview: checked('smart'),
    tab,
    volumes,
  });

  const refresh = () => {
    const groups = groupsForIds(read().groups);
    const n = groups.reduce((sum, g) => sum + g.items.length, 0);
    for (const s of SECTIONS) {
      const k = s.groups.filter((g) => groups.includes(g)).length;
      form.querySelector<HTMLElement>(`[data-count="${s.key}"]`)!.textContent = k ? `${k}/${s.groups.length}` : '';
    }
    if (tab === 'practica') {
      count.textContent = n === 0 ? 'Elegí al menos un grupo para practicar.' : `${n} elementos seleccionados`;
      start.disabled = n === 0;
      start.textContent = 'Comenzar';
    } else if (tab === 'campana') {
      const level = suggestedLevel();
      count.textContent = '';
      start.disabled = false;
      start.textContent = `Jugar: ${level.title}`;
    }
  };

  const showTab = (next: MenuTab) => {
    tab = next;
    for (const b of form.querySelectorAll<HTMLElement>('[data-tab]')) {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    }
    for (const p of form.querySelectorAll<HTMLElement>('[data-panel]')) p.hidden = p.dataset.panel !== tab;
    form.querySelector<HTMLElement>('[data-options]')!.hidden = tab === 'progreso';
    form.querySelector<HTMLElement>('.footer')!.hidden = tab === 'progreso';
    refresh();
    saveSettings(read());
  };

  form.addEventListener('change', refresh);
  bindVolumeControls(form, volumes, (v) => {
    volumes = v;
    saveSettings(read());
  });
  form.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const tabBtn = el.closest<HTMLElement>('[data-tab]');
    if (tabBtn) {
      showTab(tabBtn.dataset.tab as MenuTab);
      return;
    }
    const levelBtn = el.closest<HTMLButtonElement>('[data-level]');
    if (levelBtn && !levelBtn.disabled) {
      onStart(read(), { kind: 'level', level: LEVELS.find((l) => l.id === levelBtn.dataset.level)! });
      return;
    }
    const btn = el.closest<HTMLButtonElement>('[data-all],[data-none]');
    if (!btn) return;
    // Los botones están dentro del <summary>: evitamos que abran/cierren la sección.
    e.preventDefault();
    const key = btn.dataset.all ?? btn.dataset.none!;
    const value = btn.dataset.all !== undefined;
    form.querySelectorAll<HTMLInputElement>(`input[name=group][value^="${key}:"]`).forEach((i) => (i.checked = value));
    if (value) btn.closest('details')!.open = true;
    refresh();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (start.disabled) return;
    if (tab === 'practica') onStart(read(), { kind: 'practice' });
    else if (tab === 'campana') onStart(read(), { kind: 'level', level: suggestedLevel() });
  });
  bindProgressTab(form, () => onStart(read(), { kind: 'review' }), () => {
    // Al borrar el progreso se redibuja el menú entero (campaña y progreso cambian).
    showMenu(root, read(), onStart);
  });

  showTab(tab);
  // Sin scroll: si no, el panel arranca mostrando el final (el botón) y no los niveles.
  start.focus({ preventScroll: true });
  return () => {
    root.innerHTML = '';
  };
}

