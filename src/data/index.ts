import { HIRAGANA, KATAKANA } from './kana';
import { KANJI, KANJI_WORDS } from './kanji';
import type { ItemGroup, StudyItem } from './types';
import { HIRAGANA_WORDS, KATAKANA_WORDS } from './words';

export interface Section {
  key: string;
  title: string;
  jp: string;
  groups: ItemGroup[];
}

/** Todo el contenido, en el orden en que se muestra en los menús. */
export const SECTIONS: Section[] = [
  { key: 'hiragana', title: 'Hiragana', jp: 'ひらがな', groups: HIRAGANA },
  { key: 'katakana', title: 'Katakana', jp: 'カタカナ', groups: KATAKANA },
  { key: 'words-hiragana', title: 'Palabras en hiragana', jp: 'ことば', groups: HIRAGANA_WORDS },
  { key: 'words-katakana', title: 'Palabras en katakana', jp: 'カタカナご', groups: KATAKANA_WORDS },
  { key: 'words-kanji', title: 'Palabras con kanji', jp: 'かんじのことば', groups: KANJI_WORDS },
  { key: 'kanji', title: 'Kanji sueltos (cualquier lectura)', jp: 'かんじ', groups: KANJI },
];

export const ALL_GROUPS: ItemGroup[] = SECTIONS.flatMap((s) => s.groups);

export const ALL_ITEMS: StudyItem[] = ALL_GROUPS.flatMap((g) => g.items);

export function groupsForIds(groupIds: string[]): ItemGroup[] {
  const selected = new Set(groupIds);
  return ALL_GROUPS.filter((g) => selected.has(g.id));
}
