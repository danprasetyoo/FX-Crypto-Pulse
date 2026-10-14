import { FxService } from './fx.service';
import { CacheService } from '../cache/cache.service';
import { MemoryCacheStore } from '../cache/cache.store';
import { MetricsService } from '../cache/metrics.service';
import { loadConfig } from '../config';
import type { FrankfurterClient, FrankfurterSeries } from './frankfurter.client';
import { UnsupportedCurrencyError } from '../common/errors';

const series: FrankfurterSeries = {
  amount: 1,
  base: 'EUR',
  start_date: '2026-10-08',
  end_date: '2026-10-10',
  rates: {
    '2026-10-08': { USD: 1.16, IDR: 18800, SGD: 1.5 },
    '2026-10-09': { USD: 1.16, IDR: 18850, SGD: 1.5 },
    '2026-10-10': { USD: 1.16, IDR: 18850, SGD: 1.5 },
  },
};

function makeService(client: Partial<FrankfurterClient>) {
  const cache = new CacheService(new MemoryCacheStore(), new MetricsService());
  return new FxService(cache, client as FrankfurterClient, loadConfig({}));
}

describe('FxService', () => {
  it('menghitung kurs silang quote/base dari rate EUR dan perubahan harian', async () => {
    const svc = makeService({
      series: jest.fn(async () => series),
      currencies: jest.fn(async () => ({
        USD: 'US Dollar',
        IDR: 'Rupiah',
        SGD: 'Singapore Dollar',
        EUR: 'Euro',
      })),
    });
    const r = await svc.latest('IDR', ['USD', 'EUR']);
    const usd = r.value.rates.find((x) => x.quote === 'USD')!;
    expect(usd.rate).toBeCloseTo(18850 / 1.16, 6);
    expect(usd.previousRate).toBeCloseTo(18850 / 1.16, 6);
    expect(usd.changePct).toBeCloseTo(0, 6);
    expect(usd.date).toBe('2026-10-10');
    expect(usd.previousDate).toBe('2026-10-09');
    const eur = r.value.rates.find((x) => x.quote === 'EUR')!;
    expect(eur.rate).toBe(18850);
    expect(r.value.date).toBe('2026-10-10');
  });

  it('menolak mata uang yang tidak didukung dengan daftar yang didukung', async () => {
    const svc = makeService({
      series: jest.fn(async () => series),
      currencies: jest.fn(async () => ({ USD: 'US Dollar', IDR: 'Rupiah', EUR: 'Euro' })),
    });
    const err = await svc.latest('IDR', ['XYZ']).catch((e) => e);
    expect(err).toBeInstanceOf(UnsupportedCurrencyError);
    expect(err.getResponse().details.supported).toEqual(['EUR', 'IDR', 'USD']);
  });

  it('riwayat pasangan USD-IDR = IDR per USD per tanggal', async () => {
    const svc = makeService({
      series: jest.fn(async () => series),
      currencies: jest.fn(async () => ({ USD: 'US Dollar', IDR: 'Rupiah', EUR: 'Euro' })),
    });
    const r = await svc.history('USD-IDR', 30);
    expect(r.value.points).toHaveLength(3);
    expect(r.value.points[0]).toEqual({ date: '2026-10-08', value: 18800 / 1.16 });
    expect(r.value.points[2].date).toBe('2026-10-10');
  });

  it('memakai cache untuk panggilan kedua dengan simbol sama', async () => {
    const seriesFn = jest.fn(async () => series);
    const svc = makeService({
      series: seriesFn,
      currencies: jest.fn(async () => ({ USD: 'US Dollar', IDR: 'Rupiah', EUR: 'Euro' })),
    });
    await svc.latest('IDR', ['USD']);
    const second = await svc.latest('IDR', ['USD']);
    expect(seriesFn).toHaveBeenCalledTimes(1);
    expect(second.source).toBe('cache');
  });
});
