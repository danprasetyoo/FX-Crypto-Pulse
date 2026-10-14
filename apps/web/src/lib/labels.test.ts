import { describe, expect, it } from 'vitest';
import { compactMoney, envelopeLabel, fxDateLabel } from './labels';

describe('labels', () => {
  it('label tanggal ECB', () => {
    expect(fxDateLabel('2026-10-10')).toBe('Kurs ECB per 10 Okt 2026');
  });
  it('label stale menyebut sumber tidak tersedia, bukan kode teknis', () => {
    const txt = envelopeLabel({ updatedAt: '2026-10-10T07:05:00.000Z', stale: true });
    expect(txt).toBe('Data terakhir 14:05 WIB. Sumber sedang tidak tersedia.');
    expect(txt).not.toMatch(/429|CoinGecko|Frankfurter/);
  });
  it('compactMoney ringkas untuk badge', () => {
    expect(compactMoney(900_000_000, 'IDR')).toBe('Rp900 jt');
    expect(compactMoney(1_410_000_000, 'IDR')).toBe('Rp1,41 M');
    expect(compactMoney(86_000, 'USD')).toBe('US$86 rb');
  });
});
