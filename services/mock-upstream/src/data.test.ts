import { describe, expect, it } from 'vitest';
import { EUR_RATES, EUR_RATES_PREV, USD_IDR, businessDays, lastBusinessDay } from './data';

describe('mock data', () => {
  it('USD/IDR hari ini = 16.250 dan kemarin lebih rendah (+0,42%)', () => {
    expect(EUR_RATES.IDR / EUR_RATES.USD).toBeCloseTo(USD_IDR, 6);
    const prev = EUR_RATES_PREV.IDR / EUR_RATES_PREV.USD;
    expect(((USD_IDR - prev) / prev) * 100).toBeCloseTo(0.42, 1);
  });
  it('businessDays melewati akhir pekan', () => {
    // 2026-10-09 Jumat, 2026-10-12 Senin
    expect(businessDays('2026-10-09', '2026-10-12')).toEqual(['2026-10-09', '2026-10-12']);
    expect(lastBusinessDay(new Date('2026-10-11T10:00:00Z'))).toBe('2026-10-09');
  });
});
