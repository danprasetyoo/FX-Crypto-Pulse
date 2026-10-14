import { expect, test } from '@playwright/test';
import { BASE_URL } from '../support/env';
import { market, mock, resetMarket } from '../support/mock';

/**
 * Kebutuhan non-fungsional (PRD/FSD bagian 7-8):
 * - request pengguna tidak langsung ke upstream; cache dipakai (hit ratio tinggi),
 * - upstream down/429 -> data cache terakhir dengan stale=true dan badge warn,
 * - cache kosong + upstream gagal -> pesan jelas tanpa kode teknis,
 * - mata uang tidak didukung -> 400 dengan daftar yang didukung.
 */
test.describe('Cache dan ketahanan upstream', () => {
  test.beforeEach(async ({ request }) => {
    await resetMarket(request);
  });

  test.afterAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('permintaan berulang dilayani cache: satu panggilan upstream per mata uang', async ({
    request,
  }) => {
    const before = await mock.stats(request);
    const baseline = before.counts['GET /api/v3/coins/markets'] ?? 0;

    for (let i = 0; i < 15; i++) {
      const res = await request.get(`${BASE_URL}/api/crypto/top?vs=idr,usd`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.stale).toBe(false);
      expect(body.source).toBe(i === 0 ? 'live' : 'cache');
    }
    const after = await mock.stats(request);
    // Dua panggilan (idr + usd) untuk 15 permintaan.
    expect((after.counts['GET /api/v3/coins/markets'] ?? 0) - baseline).toBe(2);

    const m = await market.metrics(request);
    expect(m.cacheHits).toBeGreaterThanOrEqual(28);
    expect(m.cacheHitRatio).toBeGreaterThan(0.9);
  });

  test('upstream down: respons memakai cache terakhir dengan stale=true dan UI menampilkan badge', async ({
    page,
    request,
  }) => {
    // Isi cache dulu.
    const warm = await request.get(`${BASE_URL}/api/crypto/top`);
    expect((await warm.json()).stale).toBe(false);

    await mock.setMode(request, 'down');
    await market.flushFresh(request); // TTL habis, salinan terakhir tetap ada.

    const res = await request.get(`${BASE_URL}/api/crypto/top`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.source).toBe('cache');
    expect(body.data.assets).toHaveLength(20);

    await page.goto('/');
    await expect(page.getByTestId('crypto-badge')).toHaveAttribute('data-state', 'stale');
    await expect(page.getByTestId('crypto-badge')).toContainText('Sumber sedang tidak tersedia');
    // Pengguna tidak melihat kata teknis.
    await expect(page.getByTestId('crypto-badge')).not.toContainText(/429|503|CoinGecko/);
    // Angka tetap tampil.
    await expect(page.getByTestId('crypto-idr-bitcoin')).toHaveText('1.410.000.000');
  });

  test('upstream 429: tidak ada retry berulang, cooldown dipasang, data stale disajikan', async ({
    request,
  }) => {
    await request.get(`${BASE_URL}/api/fx/latest?base=IDR&quotes=USD`);
    const s0 = await mock.stats(request);
    const key = Object.keys(s0.counts).find((k) => k.startsWith('GET /v1/') && k.includes('..'))!;
    const calls0 = s0.counts[key];

    await mock.setMode(request, 'rate-limit');
    await market.flushFresh(request);

    for (let i = 0; i < 5; i++) {
      const res = await request.get(`${BASE_URL}/api/fx/latest?base=IDR&quotes=USD`);
      expect(res.status()).toBe(200);
      expect((await res.json()).stale).toBe(true);
    }
    const s1 = await mock.stats(request);
    // Hanya satu panggilan yang menerima 429; sisanya ditahan cooldown.
    expect(s1.counts[key] - calls0).toBe(1);
    const m = await market.metrics(request);
    // Minimal satu 429 tercatat (series); endpoint currencies juga bisa kena karena cache-nya ikut di-flush.
    expect(m.upstreamRateLimited).toBeGreaterThanOrEqual(1);
    expect(m.upstreamRateLimited).toBeLessThanOrEqual(2);
  });

  test('cache kosong dan upstream gagal: 503 dengan pesan jelas, UI menampilkan tombol coba lagi', async ({
    page,
    request,
  }) => {
    await mock.setMode(request, 'down');
    const res = await request.get(`${BASE_URL}/api/fx/history?pair=USD-IDR&range=30`);
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('DATA_UNAVAILABLE');
    expect(body.message).toBe('Data belum tersedia. Coba lagi beberapa saat.');

    await page.goto('/');
    await expect(page.getByTestId('error-state').first()).toContainText('Data belum tersedia');

    // Upstream pulih -> tombol coba lagi memuat data.
    await mock.setMode(request, 'ok');
    await page.getByTestId('fx-card').getByRole('button', { name: 'Coba lagi' }).click();
    await expect(page.getByTestId('fx-rate-USD')).toHaveText('16.250,00');
  });

  test('mata uang tidak didukung ditolak dengan daftar yang didukung', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/fx/latest?base=IDR&quotes=USD,XYZ`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('UNSUPPORTED_CURRENCY');
    expect(body.details.unsupported).toEqual(['XYZ']);
    expect(body.details.supported).toContain('USD');
  });

  test('timeout upstream: retry lalu fallback stale', async ({ request }) => {
    await request.get(`${BASE_URL}/api/crypto/top`);
    await mock.setMode(request, 'timeout', 10_000);
    await market.flushFresh(request);
    const t0 = Date.now();
    const res = await request.get(`${BASE_URL}/api/crypto/top`, { timeout: 30_000 });
    expect(res.status()).toBe(200);
    expect((await res.json()).stale).toBe(true);
    // 2 dtk timeout x 3 percobaan + backoff, per mata uang (paralel) -> di bawah 15 dtk.
    expect(Date.now() - t0).toBeLessThan(15_000);
  });
});
