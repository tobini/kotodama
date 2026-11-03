import { describe, expect, it } from 'vitest';
import { RomajiMatcher, canonicalRomaji } from './matcher';

function accepts(reading: string, input: string): boolean {
  const m = new RomajiMatcher(reading);
  for (const ch of input) {
    if (!m.type(ch)) return false;
  }
  return m.done;
}

describe('RomajiMatcher', () => {
  it.each([
    ['し', ['shi', 'si', 'ci']],
    ['ち', ['chi', 'ti']],
    ['つ', ['tsu', 'tu']],
    ['ふ', ['fu', 'hu']],
    ['じ', ['ji', 'zi']],
    ['を', ['wo', 'o']],
    ['きゃ', ['kya', 'kixya', 'kilya']],
    ['しょ', ['sho', 'syo', 'shixyo']],
    ['じゃ', ['ja', 'jya', 'zya']],
    ['ちゃ', ['cha', 'tya', 'cya']],
  ])('%s acepta variantes', (reading, inputs) => {
    for (const input of inputs) expect(accepts(reading, input), input).toBe(true);
  });

  it('ん antes de consonante acepta n o nn', () => {
    for (const input of ['shinbun', 'sinbun', 'shinnbun', "shin'bun"]) {
      expect(accepts('しんぶん', input), input).toBe(true);
    }
  });

  it('ん final completa la palabra con una sola n', () => {
    const m = new RomajiMatcher('ほん');
    for (const ch of 'hon') m.type(ch);
    expect(m.done).toBe(true);
  });

  it('ん antes de vocal o y exige nn', () => {
    expect(accepts('かんい', 'kani')).toBe(false);
    expect(accepts('かんい', 'kanni')).toBe(true);
    expect(accepts('かんい', "kan'i")).toBe(true);
    expect(accepts('ほんや', 'honya')).toBe(false);
    expect(accepts('ほんや', 'honnya')).toBe(true);
  });

  it('ん antes de la fila な acepta n (Hepburn)', () => {
    expect(accepts('こんにちは', 'konnichiha')).toBe(true);
    expect(accepts('こんにちは', 'konnnichiha')).toBe(true);
    expect(accepts('こんにちは', 'konichiha')).toBe(false);
  });

  it('っ duplica la consonante siguiente', () => {
    expect(accepts('きって', 'kitte')).toBe(true);
    expect(accepts('きって', 'kixtute')).toBe(true);
    expect(accepts('ちょっと', 'chotto')).toBe(true);
    expect(accepts('ちょっと', 'tyotto')).toBe(true);
    expect(accepts('まっちゃ', 'matcha')).toBe(true);
    expect(accepts('まっちゃ', 'maccha')).toBe(true);
    expect(accepts('まっちゃ', 'mattya')).toBe(true);
    expect(accepts('きって', 'kite')).toBe(false);
  });

  it('katakana con ー y combinaciones extendidas', () => {
    expect(accepts('コーヒー', 'ko-hi-')).toBe(true);
    expect(accepts('コーヒー', 'koohii')).toBe(true);
    expect(accepts('パーティー', 'pa-thi-')).toBe(true);
    expect(accepts('パーティー', 'paatii')).toBe(true);
    expect(accepts('ファン', 'fan')).toBe(true);
    expect(accepts('ファン', 'fuxan')).toBe(true);
    expect(accepts('ベッド', 'beddo')).toBe(true);
  });

  it('rechaza teclas inválidas sin consumirlas', () => {
    const m = new RomajiMatcher('か');
    expect(m.type('x')).toBe(false);
    expect(m.typed).toBe('');
    expect(m.type('k')).toBe(true);
    expect(m.type('a')).toBe(true);
    expect(m.done).toBe(true);
  });

  it('progreso y pista', () => {
    const m = new RomajiMatcher('すし');
    expect(m.remainingHint()).toBe('sushi');
    m.type('s');
    m.type('u');
    expect(m.completedUnits).toBe(1);
    m.type('s');
    expect(m.remainingHint()).toBe('hi');
  });

  it('acepta lecturas alternativas (partícula は como wa)', () => {
    for (const input of ['konnichiha', 'konnichiwa']) {
      const m = new RomajiMatcher('こんにちは', ['こんにちわ']);
      for (const ch of input) expect(m.type(ch), input).toBe(true);
      expect(m.done).toBe(true);
    }
  });

  it('acepta variantes de lectura completas (kanji sueltos)', () => {
    for (const input of ['sui', 'mizu']) {
      const m = new RomajiMatcher('スイ', [], ['みず']);
      for (const ch of input) expect(m.type(ch), input).toBe(true);
      expect(m.done).toBe(true);
    }
    const m = new RomajiMatcher('スイ', [], ['みず']);
    m.type('m');
    expect(m.reading).toBe('みず');
    expect(m.pathIndex).toBe(1);
    expect(m.remainingHint()).toBe('izu');
  });

  it('teclas iniciales posibles', () => {
    expect(new RomajiMatcher('し').nextKeys()).toEqual(new Set(['s', 'c']));
    expect(new RomajiMatcher('ふね').nextKeys()).toEqual(new Set(['f', 'h']));
    expect(new RomajiMatcher('スイ', [], ['みず']).nextKeys()).toEqual(new Set(['s', 'm']));
    const m = new RomajiMatcher('しお');
    m.type('s');
    expect(m.nextKeys()).toEqual(new Set(['h', 'i']));
  });

  it('reset vuelve al principio', () => {
    const m = new RomajiMatcher('すし');
    m.type('s');
    m.type('u');
    m.reset();
    expect(m.typed).toBe('');
    expect(m.completedUnits).toBe(0);
    expect(m.canType('s')).toBe(true);
  });

  it('romaji canónico', () => {
    expect(canonicalRomaji('ちょっと')).toBe('chotto');
    expect(canonicalRomaji('まっちゃ')).toBe('matcha');
    expect(canonicalRomaji('しんぶん')).toBe('shinbun');
    expect(canonicalRomaji('コーヒー')).toBe('ko-hi-');
  });
});
