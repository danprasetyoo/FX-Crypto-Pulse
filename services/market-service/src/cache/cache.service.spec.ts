import { CacheService } from './cache.service';
import { MemoryCacheStore } from './cache.store';
import { MetricsService } from './metrics.service';
import {
  DataUnavailableError,
  UpstreamRateLimitedError,
  UpstreamTimeoutError,
} from '../common/errors';

describe('CacheService', () => {
  let now = 1_000_000;
  let store: MemoryCacheStore;
  let metrics: MetricsService;
  let cache: CacheService;

  beforeEach(() => {
    now = 1_000_000;
    store = new MemoryCacheStore(() => now);
    metrics = new MetricsService();
    cache = new CacheService(store, metrics);
  });

  it('miss pertama memanggil upstream, hit berikutnya dari cache', async () => {
    const fetcher = jest.fn(async () => ({ v: 1 }));
    const a = await cache.getOrFetch('k', 60, fetcher);
    const b = await cache.getOrFetch('k', 60, fetcher);
    expect(a).toMatchObject({ value: { v: 1 }, source: 'live', stale: false });
    expect(b).toMatchObject({ value: { v: 1 }, source: 'cache', stale: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(metrics.snapshot()).toMatchObject({ cacheHits: 1, cacheMisses: 1, upstreamCalls: 1 });
  });

  it('permintaan bersamaan digabung menjadi satu panggilan (single-flight)', async () => {
    let resolve!: (v: unknown) => void;
    const fetcher = jest.fn(() => new Promise((r) => (resolve = r)));
    const p1 = cache.getOrFetch('k', 60, fetcher);
    const p2 = cache.getOrFetch('k', 60, fetcher);
    const p3 = cache.getOrFetch('k', 60, fetcher);
    // Pembacaan cache bersifat async; tunggu sampai fetcher benar-benar dipanggil.
    await new Promise((r) => setImmediate(r));
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve({ v: 'x' });
    const results = await Promise.all([p1, p2, p3]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => (r.value as { v: string }).v === 'x')).toBe(true);
    expect(metrics.snapshot().singleFlightJoins).toBe(2);
  });

  it('setelah TTL habis, upstream dipanggil lagi', async () => {
    const fetcher = jest.fn(async () => ({ v: 1 }));
    await cache.getOrFetch('k', 60, fetcher);
    now += 61_000;
    await cache.getOrFetch('k', 60, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('upstream gagal setelah TTL habis: sajikan salinan terakhir dengan stale=true', async () => {
    const fetcher = jest
      .fn<Promise<{ v: number }>, []>()
      .mockResolvedValueOnce({ v: 1 })
      .mockRejectedValueOnce(new UpstreamTimeoutError(5000));
    const first = await cache.getOrFetch('k', 60, fetcher);
    now += 61_000;
    const second = await cache.getOrFetch('k', 60, fetcher);
    expect(second).toMatchObject({ value: { v: 1 }, source: 'cache', stale: true });
    expect(second.updatedAt).toBe(first.updatedAt);
    expect(metrics.snapshot().staleServed).toBe(1);
  });

  it('upstream gagal tanpa cache sama sekali: DataUnavailableError', async () => {
    const fetcher = jest.fn(async () => {
      throw new UpstreamTimeoutError(5000);
    });
    await expect(cache.getOrFetch('k', 60, fetcher)).rejects.toBeInstanceOf(DataUnavailableError);
  });

  it('429 memasang cooldown sehingga upstream tidak dipanggil ulang sampai batas cache', async () => {
    const fetcher = jest
      .fn<Promise<{ v: number }>, []>()
      .mockResolvedValueOnce({ v: 1 })
      .mockRejectedValueOnce(new UpstreamRateLimitedError())
      .mockResolvedValue({ v: 2 });
    await cache.getOrFetch('k', 60, fetcher); // live
    now += 61_000;
    const r2 = await cache.getOrFetch('k', 60, fetcher); // 429 -> stale + cooldown 60 dtk
    expect(r2).toMatchObject({ stale: true, value: { v: 1 } });
    now += 10_000;
    const r3 = await cache.getOrFetch('k', 60, fetcher); // masih cooldown -> stale, tanpa panggilan
    expect(r3).toMatchObject({ stale: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    now += 60_000;
    const r4 = await cache.getOrFetch('k', 60, fetcher); // cooldown lewat -> live
    expect(r4).toMatchObject({ stale: false, value: { v: 2 } });
    expect(metrics.snapshot().upstreamRateLimited).toBe(1);
  });

  it('flushFresh mempertahankan salinan terakhir untuk fallback', async () => {
    const fetcher = jest
      .fn<Promise<{ v: number }>, []>()
      .mockResolvedValueOnce({ v: 1 })
      .mockRejectedValue(new UpstreamTimeoutError(1));
    await cache.getOrFetch('k', 60, fetcher);
    await cache.flushFresh();
    const r = await cache.getOrFetch('k', 60, fetcher);
    expect(r).toMatchObject({ stale: true, value: { v: 1 } });
  });
});
