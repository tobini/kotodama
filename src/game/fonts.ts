export const KANA_FONT = '"Klee One", "Yu Gothic", "Meiryo", sans-serif';
export const UI_FONT = '"Zen Maru Gothic", "Segoe UI", system-ui, sans-serif';

/** El canvas no espera a las fuentes web: hay que cargarlas antes de dibujar. */
export async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`600 40px ${KANA_FONT}`, 'あア漢'),
      document.fonts.load(`700 24px ${UI_FONT}`, 'Aa0'),
      document.fonts.load(`500 24px ${UI_FONT}`, 'Aa0'),
    ]);
  } catch {
    // Sin conexión se usan las fuentes del sistema.
  }
}
