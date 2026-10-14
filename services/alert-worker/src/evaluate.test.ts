import { describe, expect, it } from 'vitest';
import { conditionMet } from './evaluate';

describe('conditionMet', () => {
  it('above: harga harus lebih besar dari target', () => {
    expect(conditionMet('above', 101, 100)).toBe(true);
    expect(conditionMet('above', 100, 100)).toBe(false);
    expect(conditionMet('above', 99, 100)).toBe(false);
  });
  it('below: harga harus lebih kecil dari target', () => {
    expect(conditionMet('below', 99, 100)).toBe(true);
    expect(conditionMet('below', 100, 100)).toBe(false);
  });
  it('nilai tidak valid tidak pernah memicu', () => {
    expect(conditionMet('below', NaN, 100)).toBe(false);
    expect(conditionMet('above', 1, Infinity)).toBe(false);
  });
});
