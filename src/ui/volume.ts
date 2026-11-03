import { setMusicVolume } from '../audio/music';
import { setSfxVolume, sfx } from '../audio/sfx';
import { setVoiceVolume, speak } from '../audio/voice';
import type { Volumes } from '../settings';

const SLIDERS: { key: keyof Volumes; label: string }[] = [
  { key: 'music', label: 'Música' },
  { key: 'sfx', label: 'Efectos' },
  { key: 'voice', label: 'Voz japonesa' },
];

export function applyVolumes(v: Volumes) {
  setMusicVolume(v.music);
  setSfxVolume(v.sfx);
  setVoiceVolume(v.voice);
}

/** HTML de los controles de volumen. */
export function volumeControls(v: Volumes): string {
  return `
    <div class="volumes">
      ${SLIDERS.map((s) => `
        <label class="volume">
          <span class="volume-label">${s.label}</span>
          <input type="range" min="0" max="100" step="5" name="vol-${s.key}" value="${Math.round(v[s.key] * 100)}" />
          <span class="volume-value" data-vol="${s.key}">${Math.round(v[s.key] * 100)}</span>
        </label>`).join('')}
    </div>`;
}

/**
 * Conecta los sliders: el volumen se aplica en vivo mientras se arrastra, y al soltar
 * suena una muestra (efectos / voz) y se avisa el cambio para guardarlo.
 */
export function bindVolumeControls(root: HTMLElement, initial: Volumes, onChange: (v: Volumes) => void) {
  const volumes = { ...initial };
  for (const s of SLIDERS) {
    const input = root.querySelector<HTMLInputElement>(`input[name="vol-${s.key}"]`)!;
    const value = root.querySelector<HTMLElement>(`[data-vol="${s.key}"]`)!;
    input.addEventListener('input', () => {
      volumes[s.key] = Number(input.value) / 100;
      value.textContent = input.value;
      applyVolumes(volumes);
    });
    input.addEventListener('change', () => {
      if (s.key === 'sfx') sfx.banish(0);
      if (s.key === 'voice') speak('こんにちは');
      onChange({ ...volumes });
    });
  }
}
