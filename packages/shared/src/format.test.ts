import { describe, expect, it } from 'vitest';
import {
  formatChangePct,
  formatDateId,
  formatFxRate,
  formatMoney,
  historyToCsv,
  pctChange,
  trendOf,
} from './format.js';

describe('formatChangePct', () => {
  it('menyertakan panah dan tanda, bukan hanya warna', () => {
    expect(formatChangePct(0.42)).toBe('▲ +0,42%');
    expect(formatChangePct(-0.18)).toBe('▼ -0,18%');
    expect(formatChangePct(0)).toBe('■ 0,00%');
    expect(formatChangePct(null)).toBe('—');
  });
});

describe('trendOf', () => {
  it('mengklasifikasikan arah', () => {
    expect(trendOf(1)).toBe('up');
    expect(trendOf(-1)).toBe('down');
    expect(trendOf(0)).toBe('flat');
    expect(trendOf(null)).toBe('flat');
  });
});

describe('format angka', () => {
  it('memakai pemisah ribuan id-ID', () => {
    expect(formatFxRate(16250)).toBe('16.250,00');
    expect(formatMoney(1410000000, 'IDR')).toMatch(/^Rp\s?1\.410\.000\.000$/);
  });
  it('tanggal ECB menjadi format Indonesia', () => {
    expect(formatDateId('2026-10-10')).toBe('10 Okt 2026');
  });
});

describe('pctChange', () => {
  it('menghitung persen perubahan', () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(100, 0)).toBeNull();
    expect(pctChange(100, null)).toBeNull();
  });
});

describe('historyToCsv', () => {
  it('berisi tanggal, nilai, dan rentang', () => {
    const csv = historyToCsv(
      [
        { date: '2026-10-01', value: 1 },
        { date: '2026-10-02', value: 2 },
      ],
      30,
    );
    expect(csv).toBe('date,value,range\n2026-10-01,1,30\n2026-10-02,2,30\n');
  });
});
