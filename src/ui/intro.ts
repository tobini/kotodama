import { speak } from '../audio/voice';
import type { StudyItem } from '../data/types';
import { canonicalRomaji } from '../romaji/matcher';

/** Cuántas tarjetas se muestran como máximo; el resto se descubre jugando. */
const MAX_CARDS = 24;

export interface IntroActions {
  onStart: () => void;
  onMenu: () => void;
}

function card(item: StudyItem, index: number): string {
  // Kanji suelto: todas sus lecturas. Palabra con kanji: lectura y romaji. Kana: romaji.
  const reading = item.kind === 'kanji' ? `<div class="reading">${item.notes ?? item.reading}</div>`
    : item.script === 'kanji' ? `<div class="reading">${item.reading}</div><div class="romaji">${canonicalRomaji(item.reading)}</div>`
      : `<div class="romaji">${canonicalRomaji(item.reading)}</div>`;
  return `
    <button type="button" class="intro-card ${item.kind === 'kana' ? '' : 'wide'}" data-card="${index}">
      <div class="kana">${item.text}</div>
      ${reading}
      ${item.meaning ? `<div class="meta">${item.meaning}</div>` : ''}
    </button>`;
}

/** Presenta lo nuevo de un nivel antes de jugarlo. Devuelve una función para desmontarla. */
export function showIntro(root: HTMLElement, title: string, items: StudyItem[], actions: IntroActions): () => void {
  const shown = items.slice(0, MAX_CARDS);
  const rest = items.length - shown.length;
  root.innerHTML = `
    <div class="panel">
      <div class="title"><h1>新</h1><span class="name">Lo nuevo en ${title}</span></div>
      <p class="subtitle">Mirá cada uno antes de empezar; tocalo o pasá el mouse para escucharlo.
        Al principio vas a ver la ayuda y se irá retirando a medida que los aprendas.</p>
      <div class="intro-cards">${shown.map(card).join('')}</div>
      ${rest > 0 ? `<p class="empty">…y ${rest} más que vas a ir descubriendo en el nivel.</p>` : ''}
      <div class="footer">
        <div class="help"><kbd>Enter</kbd> o <kbd>Espacio</kbd> empezar · <kbd>Esc</kbd> menú</div>
        <div class="buttons">
          <button class="btn secondary" id="menu-btn">Menú</button>
          <button class="btn" id="start-btn">Empezar</button>
        </div>
      </div>
    </div>`;

  const say = (el: HTMLElement | null) => {
    const item = el ? shown[Number(el.dataset.card)] : undefined;
    if (item) speak(item.spoken?.[0] ?? item.reading);
  };
  const cards = root.querySelector<HTMLElement>('.intro-cards')!;
  cards.addEventListener('click', (e) => say((e.target as HTMLElement).closest<HTMLElement>('[data-card]')));
  cards.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
    const from = (e.relatedTarget as HTMLElement | null)?.closest('[data-card]');
    if (el && el !== from) say(el);
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      actions.onStart();
    } else if (e.key === 'Escape') {
      actions.onMenu();
    }
  };
  // Misma demora que en los resultados: que la tecla con la que se llegó no la saltee.
  const timer = window.setTimeout(() => window.addEventListener('keydown', onKey), 400);
  root.querySelector('#start-btn')!.addEventListener('click', actions.onStart);
  root.querySelector('#menu-btn')!.addEventListener('click', actions.onMenu);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    root.innerHTML = '';
  };
}
