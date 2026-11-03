import { toKatakana } from '../romaji/kana';
import type { ItemGroup, Script, StudyItem } from './types';

const HIRAGANA_GROUPS: { id: string; name: string; kana: string[] }[] = [
  { id: 'a', name: 'Vocales', kana: [...'あいうえお'] },
  { id: 'k', name: 'K', kana: [...'かきくけこ'] },
  { id: 's', name: 'S', kana: [...'さしすせそ'] },
  { id: 't', name: 'T', kana: [...'たちつてと'] },
  { id: 'n', name: 'N', kana: [...'なにぬねの'] },
  { id: 'h', name: 'H', kana: [...'はひふへほ'] },
  { id: 'm', name: 'M', kana: [...'まみむめも'] },
  { id: 'y', name: 'Y', kana: [...'やゆよ'] },
  { id: 'r', name: 'R', kana: [...'らりるれろ'] },
  { id: 'w', name: 'W · N', kana: [...'わをん'] },
  { id: 'g', name: 'G', kana: [...'がぎぐげご'] },
  { id: 'z', name: 'Z', kana: [...'ざじずぜぞ'] },
  { id: 'd', name: 'D', kana: [...'だぢづでど'] },
  { id: 'b', name: 'B', kana: [...'ばびぶべぼ'] },
  { id: 'p', name: 'P', kana: [...'ぱぴぷぺぽ'] },
  {
    id: 'yoon',
    name: 'Combinados',
    kana: ['きゃ', 'きゅ', 'きょ', 'しゃ', 'しゅ', 'しょ', 'ちゃ', 'ちゅ', 'ちょ', 'にゃ', 'にゅ', 'にょ',
      'ひゃ', 'ひゅ', 'ひょ', 'みゃ', 'みゅ', 'みょ', 'りゃ', 'りゅ', 'りょ'],
  },
  {
    id: 'yoon-d',
    name: 'Combinados con ゛゜',
    kana: ['ぎゃ', 'ぎゅ', 'ぎょ', 'じゃ', 'じゅ', 'じょ', 'びゃ', 'びゅ', 'びょ', 'ぴゃ', 'ぴゅ', 'ぴょ'],
  },
];

// Solo existen (en la práctica) en katakana, para escribir palabras extranjeras.
const KATAKANA_EXTENDED = {
  id: 'ext',
  name: 'Extendidos',
  kana: ['ファ', 'フィ', 'フェ', 'フォ', 'ティ', 'ディ', 'ウィ', 'ウェ', 'ウォ', 'シェ', 'ジェ', 'チェ', 'ヴ'],
};

function makeGroup(script: Script, id: string, name: string, kana: string[]): ItemGroup {
  const items: StudyItem[] = kana.map((k) => ({
    id: `kana:${script}:${k}`,
    text: k,
    reading: k,
    script,
    kind: 'kana',
    level: 'N5',
    tags: [id],
  }));
  return { id: `${script}:${id}`, name, items };
}

export const HIRAGANA: ItemGroup[] = HIRAGANA_GROUPS.map((g) => makeGroup('hiragana', g.id, g.name, g.kana));

export const KATAKANA: ItemGroup[] = [
  ...HIRAGANA_GROUPS.map((g) => makeGroup('katakana', g.id, g.name, g.kana.map(toKatakana))),
  makeGroup('katakana', KATAKANA_EXTENDED.id, KATAKANA_EXTENDED.name, KATAKANA_EXTENDED.kana),
];
