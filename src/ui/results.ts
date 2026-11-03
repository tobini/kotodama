import type { StudyItem } from '../data/types';
import type { GameResult } from '../game/game';
import type { CampaignLevel } from '../progress/campaign';
import { canonicalRomaji } from '../romaji/matcher';

function stat(name: string, value: string): string {
  return `<div class="stat"><div class="value">${value}</div><div class="name">${name}</div></div>`;
}

export interface ResultsExtras {
  /** Ítems que en esta partida pasaron a estar dominados. */
  newlyMastered: StudyItem[];
  campaign?: {
    level: CampaignLevel;
    stars: number;
    /** Si es la mejor marca del nivel. */
    record: boolean;
  };
}

export interface ResultsActions {
  onRetry: () => void;
  onMenu: () => void;
  /** Solo si hay un nivel siguiente desbloqueado. */
  onNext?: () => void;
}

function starsHtml(n: number): string {
  return '<span class="big-stars">' + '★'.repeat(n) + '<span class="off">' + '☆'.repeat(3 - n) + '</span></span>';
}

/** Pantalla de fin de partida. Devuelve una función para desmontarla. */
export function showResults(
  root: HTMLElement,
  result: GameResult,
  extras: ResultsExtras,
  actions: ResultsActions,
): () => void {
  const { onRetry, onMenu, onNext } = actions;
  const { campaign } = extras;
  const correct = result.keystrokes - result.errors;
  const accuracy = result.keystrokes ? Math.round((correct / result.keystrokes) * 100) : 100;
  const perMinute = result.seconds > 5 ? Math.round(result.defeated / (result.seconds / 60)) : 0;
  const review = result.struggles.slice(0, 18);

  root.innerHTML = `
    <div class="panel">
      <div class="title">
        <h1>${result.victory ? '勝' : '終'}</h1>
        <span class="name">${campaign
          ? `Nivel ${campaign.level.title}: ${result.victory ? '¡superado!' : 'no superado'}`
          : result.victory ? '¡El santuario está a salvo!' : 'Fin de la partida'}</span>
      </div>
      ${campaign ? `
        <div class="level-result">
          ${starsHtml(campaign.stars)}
          <span>${campaign.record ? '¡Nueva mejor marca!' : result.victory ? '' : 'Ganá el nivel para desbloquear el siguiente.'}
            <span class="help">★ ganar · ★★ 90 % de precisión · ★★★ 95 % sin perder faroles</span></span>
        </div>` : ''}
      <div class="stats">
        ${stat('Puntos', result.score.toLocaleString('es-AR'))}
        ${stat('Oleada', result.totalWaves ? `${result.wave} / ${result.totalWaves}` : String(result.wave))}
        ${stat('Desterrados', String(result.defeated))}
        ${stat('Precisión', `${accuracy}%`)}
        ${stat('Combo máximo', String(result.maxCombo))}
        ${stat('Por minuto', String(perMinute))}
      </div>

      ${extras.newlyMastered.length ? `
        <h2>Nuevos dominados</h2>
        <div class="mastered">${extras.newlyMastered.map((i) => `<span class="tile m-mastered ${i.kind === 'word' ? 'wide' : ''}">${i.text}</span>`).join('')}</div>` : ''}

      <h2>Para repasar</h2>
      ${review.length === 0
        ? '<p class="empty">¡Sin errores! Nada para repasar.</p>'
        : `<div class="review">${review.map((r) => `
            <div class="review-item">
              <div class="kana">${r.item.text}</div>
              ${r.item.kind === 'kanji'
                ? `<div class="reading">${r.item.notes ?? r.item.reading}</div>`
                : r.item.script === 'kanji' ? `<div class="reading">${r.item.reading}</div>` : ''}
              ${r.item.kind === 'kanji' ? '' : `<div class="romaji">${canonicalRomaji(r.item.reading)}</div>`}
              ${r.item.meaning ? `<div class="meta">${r.item.meaning}</div>` : ''}
              <div class="meta">${[
                r.escaped ? `${r.escaped} se escapó` : '',
                r.errors ? `${r.errors} error${r.errors > 1 ? 'es' : ''}` : '',
              ].filter(Boolean).join(' · ')}</div>
            </div>`).join('')}</div>`}

      <div class="footer">
        <div class="help"><kbd>Enter</kbd> ${onNext ? 'siguiente nivel' : 'jugar de nuevo'} · <kbd>Esc</kbd> menú</div>
        <div class="buttons">
          <button class="btn secondary" id="menu-btn">Menú</button>
          <button class="btn ${onNext ? 'secondary' : ''}" id="retry-btn">Jugar de nuevo</button>
          ${onNext ? '<button class="btn" id="next-btn">Siguiente nivel</button>' : ''}
        </div>
      </div>
    </div>`;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (onNext ?? onRetry)();
    } else if (e.key === 'Escape') {
      onMenu();
    }
  };
  // Pequeña demora para que la última tecla de la partida no dispare nada.
  const timer = window.setTimeout(() => window.addEventListener('keydown', onKey), 400);
  root.querySelector('#retry-btn')!.addEventListener('click', onRetry);
  root.querySelector('#menu-btn')!.addEventListener('click', onMenu);
  if (onNext) root.querySelector('#next-btn')!.addEventListener('click', onNext);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    root.innerHTML = '';
  };
}
