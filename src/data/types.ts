export type Script = 'hiragana' | 'katakana' | 'kanji';

/** Nivel JLPT de referencia. Se agregarán N4, N3... a medida que crezca el contenido. */
export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface StudyItem {
  id: string;
  /** Lo que se muestra en pantalla. */
  text: string;
  /** Lectura en kana: es lo que se valida al escribir en romaji. */
  reading: string;
  /** Otras lecturas aceptadas, de la misma longitud (ej. こんにちわ para こんにちは). */
  altReadings?: string[];
  /** Otras lecturas completas válidas, de cualquier longitud (kanji sueltos: スイ / みず). */
  variants?: string[];
  /**
   * Cómo se pronuncia cada lectura ([reading, ...variants]) cuando difiere de lo que se
   * escribe. Ej. 食 se escribe "ta" pero se pronuncia たべる.
   */
  spoken?: string[];
  /** Información extra para repasar (ej. todas las lecturas de un kanji). */
  notes?: string;
  /** Significado en español (para palabras). */
  meaning?: string;
  script: Script;
  kind: 'kana' | 'kanji' | 'word';
  level: JlptLevel;
  tags: string[];
}

export interface ItemGroup {
  id: string;
  name: string;
  items: StudyItem[];
}
