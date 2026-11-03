import { ALL_ITEMS, SECTIONS } from '../data';
import type { ItemGroup, StudyItem } from '../data/types';
import { resetCampaign } from '../progress/campaign';
import { masteryOf, resetStats, statsOf, weakestItems, type MasteryLevel } from '../progress/stats';
import { canonicalRomaji } from '../romaji/matcher';

const LEVEL_NAMES: Record<MasteryLevel, string> = {
  unseen: 'sin ver',
  weak: 'débil',
  learning: 'aprendiendo',
  mastered: 'dominado',
};

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function tooltip(item: StudyItem): string {
  const reading = item.kind === 'kanji' ? item.notes ?? item.reading
    : item.script === 'kanji' ? `${item.reading} · ${canonicalRomaji(item.reading)}`
      : canonicalRomaji(item.reading);
  const lines = [`${item.text} — ${reading}`];
  if (item.meaning) lines.push(item.meaning);
  const s = statsOf(item.id);
  lines.push(s
    ? `Visto ${s.seen} · bien ${s.clean} · con errores ${s.errors} · se escapó ${s.escaped}`
    : 'Todavía no apareció');
  return escapeAttr(lines.join('\n'));
}

function tiles(group: ItemGroup): string {
  return `
    <div class="group-tiles">
      <div class="group-name">${group.name}</div>
      <div class="tiles">
        ${group.items.map((i) => `
          <span class="tile m-${masteryOf(i.id)} ${i.kind === 'word' ? 'wide' : ''}" title="${tooltip(i)}">${i.text}</span>`).join('')}
      </div>
    </div>`;
}

function counts(items: StudyItem[]): Record<MasteryLevel, number> {
  const c: Record<MasteryLevel, number> = { unseen: 0, weak: 0, learning: 0, mastered: 0 };
  for (const i of items) c[masteryOf(i.id)]++;
  return c;
}

/** HTML de la pestaña de progreso. */
export function progressTab(): string {
  const total = counts(ALL_ITEMS);
  const weak = weakestItems(ALL_ITEMS).length;
  return `
    <p class="tab-intro">Cada kana, palabra y kanji sube de nivel cuando lo escribís bien y baja cuando te equivocás
      o se te escapa. Con el repaso activado, lo más débil aparece más seguido. Pasá el mouse por encima para ver detalles.</p>
    <div class="progress-head">
      <div class="legend">
        ${(Object.keys(LEVEL_NAMES) as MasteryLevel[]).map((m) => `
          <span class="legend-item"><span class="tile m-${m}"></span>${LEVEL_NAMES[m]} <b>${total[m]}</b></span>`).join('')}
      </div>
      <button type="button" class="btn" id="review-btn" ${weak ? '' : 'disabled'}>
        Repasar lo más débil${weak ? ` (${weak})` : ''}
      </button>
    </div>
    ${SECTIONS.map((s) => {
      const items = s.groups.flatMap((g) => g.items);
      const c = counts(items);
      return `
        <details class="section" ${c.unseen < items.length ? 'open' : ''}>
          <summary>
            <span class="section-title">${s.title} <span class="jp">${s.jp}</span></span>
            <span class="section-progress">
              <span class="bar"><span class="m-mastered" style="width:${(c.mastered / items.length) * 100}%"></span><span class="m-learning" style="width:${(c.learning / items.length) * 100}%"></span><span class="m-weak" style="width:${(c.weak / items.length) * 100}%"></span></span>
              ${c.mastered}/${items.length} dominados
            </span>
          </summary>
          ${s.groups.map(tiles).join('')}
        </details>`;
    }).join('')}
    <p class="danger-zone"><button type="button" class="link-btn" id="reset-progress">Borrar todo el progreso</button></p>`;
}

export function bindProgressTab(root: HTMLElement, onReview: () => void, onReset: () => void) {
  root.querySelector('#review-btn')?.addEventListener('click', onReview);
  root.querySelector('#reset-progress')?.addEventListener('click', () => {
    if (!confirm('¿Borrar todas las estadísticas y el avance de la campaña? No se puede deshacer.')) return;
    resetStats();
    resetCampaign();
    onReset();
  });
}
