import { describe, expect, it } from 'vitest';
import { kanaItemForUnit, romajiStages, stageForBox } from './help';

describe('ayuda gradual', () => {
  it('se retira a medida que sube la caja', () => {
    expect([0, 1, 2, 3, 4, 5].map(stageForBox)).toEqual(['full', 'full', 'delayed', 'delayed', 'none', 'none']);
  });

  it('cada unidad de una palabra se asocia a su kana', () => {
    expect(kanaItemForUnit('し')?.text).toBe('し');
    expect(kanaItemForUnit('っち')?.text).toBe('ち');
    expect(kanaItemForUnit('キャ')?.text).toBe('キャ');
    expect(kanaItemForUnit('ー')).toBeUndefined();
  });

  it('siempre y nunca no dependen de lo aprendido', () => {
    expect(romajiStages(['す', 'し'], 'siempre')).toEqual(['full', 'full']);
    expect(romajiStages(['す', 'し'], 'nunca')).toEqual(['off', 'off']);
  });
});
