// Romanizaciones aceptadas para cada unidad de kana (en hiragana; el katakana se
// normaliza antes de buscar). La primera opción es la canónica: es la que se
// muestra como pista. El resto son variantes que también aceptan los IME.

const BASE: Record<string, string[]> = {
  あ: ['a'], い: ['i'], う: ['u'], え: ['e'], お: ['o'],
  か: ['ka', 'ca'], き: ['ki'], く: ['ku', 'cu', 'qu'], け: ['ke'], こ: ['ko', 'co'],
  さ: ['sa'], し: ['shi', 'si', 'ci'], す: ['su'], せ: ['se', 'ce'], そ: ['so'],
  た: ['ta'], ち: ['chi', 'ti'], つ: ['tsu', 'tu'], て: ['te'], と: ['to'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he'], ほ: ['ho'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'],
  ら: ['ra'], り: ['ri'], る: ['ru'], れ: ['re'], ろ: ['ro'],
  わ: ['wa'], を: ['wo', 'o'], ん: ['n', 'nn', "n'", 'xn'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  だ: ['da'], ぢ: ['di', 'ji'], づ: ['du', 'zu'], で: ['de'], ど: ['do'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
  ゔ: ['vu'],
  ぁ: ['xa', 'la'], ぃ: ['xi', 'li'], ぅ: ['xu', 'lu'], ぇ: ['xe', 'le'], ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'], ゅ: ['xyu', 'lyu'], ょ: ['xyo', 'lyo'], ゎ: ['xwa', 'lwa'],
  っ: ['xtu', 'ltu', 'xtsu', 'ltsu'],
  ー: ['-'],
};

// Combinaciones con ゃゅょ (yōon): kana base → prefijos romaji posibles.
const YOON_PREFIXES: Record<string, string[]> = {
  き: ['ky'], ぎ: ['gy'], し: ['sh', 'sy'], じ: ['j', 'zy', 'jy'], ち: ['ch', 'ty', 'cy'],
  ぢ: ['dy'], に: ['ny'], ひ: ['hy'], び: ['by'], ぴ: ['py'], み: ['my'], り: ['ry'],
};

// Combinaciones extendidas, usadas sobre todo en katakana (ファ, ティ, ...).
const EXTENDED: Record<string, string[]> = {
  ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'],
  てぃ: ['thi', 'ti'], でぃ: ['dhi', 'di'], でゅ: ['dhu'], とぅ: ['twu'], どぅ: ['dwu'],
  うぃ: ['wi'], うぇ: ['we'], うぉ: ['who', 'wo'], いぇ: ['ye'],
  ゔぁ: ['va'], ゔぃ: ['vi'], ゔぇ: ['ve'], ゔぉ: ['vo'],
  つぁ: ['tsa'], つぃ: ['tsi'], つぇ: ['tse'], つぉ: ['tso'],
  しぇ: ['she', 'sye'], じぇ: ['je', 'zye', 'jye'], ちぇ: ['che', 'tye', 'cye'],
};

function buildTable(): Record<string, string[]> {
  const table: Record<string, string[]> = { ...BASE, ...EXTENDED };
  const vowels: [string, string][] = [['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']];
  for (const [kana, prefixes] of Object.entries(YOON_PREFIXES)) {
    for (const [small, vowel] of vowels) {
      table[kana + small] = prefixes.map((p) => p + vowel);
    }
  }
  return table;
}

export const KANA_ROMAJI: Record<string, string[]> = buildTable();
