import { expect, type APIRequestContext } from '@playwright/test';
import { BASE_URL, MOCK_URL } from './env';

export type MockMode = 'ok' | 'down' | 'rate-limit' | 'timeout';

/** Kendali mock-upstream (Frankfurter + CoinGecko tiruan). */
export const mock = {
  async setMode(
    request: APIRequestContext,
    mode: MockMode,
    timeoutDelayMs?: number,
  ): Promise<void> {
    const res = await request.post(`${MOCK_URL}/__control/mode`, {
      data: { mode, timeoutDelayMs },
    });
    expect(res.ok()).toBeTruthy();
  },
  async setPrice(
    request: APIRequestContext,
    id: string,
    price: { usd?: number; idr?: number },
  ): Promise<void> {
    const res = await request.post(`${MOCK_URL}/__control/price`, { data: { id, ...price } });
    expect(res.ok()).toBeTruthy();
  },
  async reset(request: APIRequestContext): Promise<void> {
    const res = await request.post(`${MOCK_URL}/__control/reset`);
    expect(res.ok()).toBeTruthy();
  },
  async stats(
    request: APIRequestContext,
  ): Promise<{ mode: MockMode; counts: Record<string, number> }> {
    const res = await request.get(`${MOCK_URL}/__control/stats`);
    expect(res.ok()).toBeTruthy();
    return res.json();
  },
};

/** Kendali admin market-service (hanya aktif saat MARKET_ADMIN_ENABLED=true). */
export const market = {
  /** Hapus cache segar; salinan terakhir tetap ada untuk fallback stale. */
  async flushFresh(request: APIRequestContext): Promise<void> {
    const res = await request.post(`${BASE_URL}/api/market/cache/flush`);
    expect(res.ok()).toBeTruthy();
  },
  /** Hapus semua cache termasuk salinan terakhir dan cooldown, lalu reset metrik. */
  async flushAll(request: APIRequestContext): Promise<void> {
    const res = await request.post(`${BASE_URL}/api/market/cache/flush-all`);
    expect(res.ok()).toBeTruthy();
  },
  async metrics(request: APIRequestContext): Promise<{
    cacheHits: number;
    cacheMisses: number;
    cacheHitRatio: number;
    upstreamCalls: number;
    upstreamRateLimited: number;
  }> {
    const res = await request.get(`${BASE_URL}/api/market/metrics`);
    expect(res.ok()).toBeTruthy();
    return res.json();
  },
};

/** Mengembalikan stack ke kondisi bersih: mode ok, harga default, cache kosong. */
export async function resetMarket(request: APIRequestContext): Promise<void> {
  await mock.reset(request);
  await market.flushAll(request);
}
