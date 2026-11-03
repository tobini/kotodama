import type { Volumes } from '../settings';
import { bindVolumeControls, volumeControls } from './volume';

interface PauseActions {
  onResume: () => void;
  onQuit: () => void;
  onVolumes: (v: Volumes) => void;
}

/** Menú de pausa (Esc lo cierra desde el juego). Devuelve una función para desmontarlo. */
export function showPause(root: HTMLElement, volumes: Volumes, actions: PauseActions): () => void {
  root.innerHTML = `
    <div class="panel narrow">
      <div class="title"><h1>休</h1><span class="name">Pausa</span></div>
      <h2>Volumen</h2>
      ${volumeControls(volumes)}
      <div class="footer">
        <div class="help"><kbd>Esc</kbd> seguir · <kbd>Q</kbd> terminar</div>
        <div class="buttons">
          <button class="btn secondary" id="quit-btn">Terminar partida</button>
          <button class="btn" id="resume-btn">Continuar</button>
        </div>
      </div>
    </div>`;
  bindVolumeControls(root, volumes, actions.onVolumes);
  root.querySelector('#resume-btn')!.addEventListener('click', actions.onResume);
  root.querySelector('#quit-btn')!.addEventListener('click', actions.onQuit);
  return () => {
    // Que el foco no quede en un slider: las flechas o letras lo moverían al seguir jugando.
    (document.activeElement as HTMLElement | null)?.blur();
    root.innerHTML = '';
  };
}
