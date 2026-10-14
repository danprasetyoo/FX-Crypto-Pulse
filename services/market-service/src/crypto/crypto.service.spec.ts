import { CryptoService } from './crypto.service';
import { CacheService } from '../cache/cache.service';
import { MemoryCacheStore } from '../cache/cache.store';
import { MetricsService } from '../cache/metrics.service';
import { loadConfig } from '../config';
import type { CoinGeckoClient, CoinMarket } from './coingecko.client';

const market = (id: string, price: number, change: number | null = 1.2): CoinMarket => ({
  id,
  symbol: id.slice(0, 3),
  name: id.toUpperCase(),
  image: null,
  market_cap_rank: 1,
  current_price: price,
  price_change_percentage_24h: change,
});

describe('CryptoService', () => {
  it('menggabungkan harga IDR dan USD per aset dengan satu request per mata uang', async () => {
    const topMarkets = jest.fn(async (vs: string) =>
      vs === 'idr'
        ? [market('bitcoin', 1_410_000_000), market('ethereum', 52_800_000, -0.64)]
        : [market('bitcoin', 86_000), market('ethereum', 3_200, -0.64)],
    );
    const svc = new CryptoService(
      new CacheService(new MemoryCacheStore(), new MetricsService()),
      { topMarkets } as unknown as CoinGeckoClient,
      loadConfig({}),
    );
    const r = await svc.top(['idr', 'usd']);
    expect(topMarkets).toHaveBeenCalledTimes(2);
    expect(r.value.assets).toHaveLength(2);
    expect(r.value.assets[0]).toMatchObject({
      id: 'bitcoin',
      price: { idr: 1_410_000_000, usd: 86_000 },
    });
    expect(r.value.assets[1].change24hPct.idr).toBe(-0.64);
    // Panggilan kedua dari cache
    const r2 = await svc.top(['idr', 'usd']);
    expect(topMarkets).toHaveBeenCalledTimes(2);
    expect(r2.source).toBe('cache');
  });

  it('toDaily mengambil titik terakhir per tanggal UTC', () => {
    const day = Date.UTC(2026, 9, 10);
    const points = CryptoService.toDaily({
      prices: [
        [day + 3600_000, 10],
        [day + 7200_000, 11],
        [day + 86_400_000, 12],
      ],
    });
    expect(points).toEqual([
      { date: '2026-10-10', value: 11 },
      { date: '2026-10-11', value: 12 },
    ]);
  });
});
