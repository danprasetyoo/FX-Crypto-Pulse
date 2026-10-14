import { expect, test, type APIRequestContext } from '@playwright/test';
import { registerViaUi } from '../support/auth';
import { BASE_URL, WORKER_URL } from '../support/env';
import { mailpit } from '../support/mailpit';
import { market, mock, resetMarket } from '../support/mock';

/** Memicu satu siklus evaluasi worker (WORKER_ADMIN_ENABLED=true di overlay e2e). */
async function runWorker(request: APIRequestContext) {
  const res = await request.post(`${WORKER_URL}/run`);
  expect(res.ok(), await res.text()).toBeTruthy();
  return res.json() as Promise<{
    evaluated: number;
    matched: number;
    sent: number;
    failed: number;
  }>;
}

/**
 * F4 (gerbang kualitas 3): alert uji terkirim tepat sekali, status menjadi terpicu,
 * siklus berikutnya tidak mengirim ulang, aktivasi ulang membuat alert dicek lagi.
 */
test.describe('Alert harga', () => {
  test.beforeEach(async ({ request }) => {
    await resetMarket(request);
  });

  test.afterAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('form alert: validasi target dan simpan', async ({ page }) => {
    await registerViaUi(page);
    await page.getByTestId('btn-new-alert').click();
    await expect(page).toHaveURL(/\/alerts\/new$/);
    await expect(page.getByTestId('alert-form')).toContainText(
      'Notifikasi email dikirim sekali saat kondisi terpenuhi',
    );

    await page.getByTestId('alert-submit').click();
    await expect(page.getByTestId('alert-error')).toContainText(
      'Harga target harus angka lebih dari 0.',
    );

    await page.getByTestId('alert-asset').selectOption('crypto:bitcoin');
    await page.getByLabel('Di bawah').check();
    await page.getByTestId('alert-target').fill('900000000');
    await page.getByTestId('alert-submit').click();
    await expect(page).toHaveURL(/\/alerts$/);
    const item = page.getByTestId('alert-list').locator('li').first();
    await expect(item).toContainText('Bitcoin di bawah');
    await expect(item).toContainText('900.000.000');
    await expect(item).toHaveAttribute('data-status', 'active');

    // Badge alert aktif di watchlist (jika aset ada di watchlist).
    await page.goto('/watchlist');
    await page.getByTestId('btn-add-watchlist').click();
    await page.getByTestId('watchlist-asset').selectOption('bitcoin');
    await page.getByTestId('watchlist-submit').click();
    await expect(page.getByTestId('watchlist-alert-bitcoin')).toHaveText(
      'Alert aktif: di bawah Rp900 jt',
    );
  });

  test('alert terpicu tepat sekali: email terkirim, status terpicu, siklus berikutnya tidak mengirim lagi', async ({
    page,
    request,
  }) => {
    const email = await registerViaUi(page);
    await page.goto('/alerts/new');
    await page.getByTestId('alert-asset').selectOption('crypto:bitcoin');
    await page.getByLabel('Di bawah').check();
    await page.getByTestId('alert-target').fill('900000000');
    await page.getByTestId('alert-submit').click();
    await expect(page).toHaveURL(/\/alerts$/);
    const item = page.getByTestId('alert-list').locator('li').first();
    const alertId = (await item.getAttribute('data-testid'))!.replace('alert-item-', '');

    // Harga masih Rp1,41 M: belum terpicu.
    const r1 = await runWorker(request);
    expect(r1.evaluated).toBeGreaterThanOrEqual(1);
    expect(r1.sent).toBe(0);
    expect(await mailpit.forRecipient(request, email)).toHaveLength(0);

    // Harga turun ke Rp850 jt; cache dikosongkan agar worker membaca harga baru.
    await mock.setPrice(request, 'bitcoin', { usd: 52307.69, idr: 850_000_000 });
    await market.flushFresh(request);
    // Alert milik pengguna lain (dari test sebelumnya) bisa ikut terpicu; yang diuji adalah email pengguna ini.
    const r2 = await runWorker(request);
    expect(r2.sent).toBeGreaterThanOrEqual(1);

    const mails = await mailpit.waitForCount(request, email, 1);
    expect(mails).toHaveLength(1);
    expect(mails[0].Subject).toContain('Alert harga');
    expect(mails[0].Subject).toContain('di bawah');
    const text = await mailpit.text(request, mails[0].ID);
    expect(text).toContain('Rp');
    expect(text).toContain('bukan saran investasi');

    // Status di UI menjadi terpicu.
    await page.reload();
    await expect(page.getByTestId(`alert-status-${alertId}`)).toHaveText('Terpicu');
    await expect(page.getByTestId(`alert-item-${alertId}`)).toContainText('Terpicu');

    // Siklus berikutnya: harga masih di bawah target, tetapi tidak ada email kedua.
    const r3 = await runWorker(request);
    expect(r3.sent).toBe(0);
    await new Promise((r) => setTimeout(r, 1000));
    expect(await mailpit.forRecipient(request, email)).toHaveLength(1);

    // Aktifkan kembali -> dicek lagi -> email kedua (aktivasi berbeda), tetap satu per aktivasi.
    await page.getByTestId(`alert-reactivate-${alertId}`).click();
    await expect(page.getByTestId(`alert-status-${alertId}`)).toHaveText('Aktif');
    const r4 = await runWorker(request);
    expect(r4.sent).toBeGreaterThanOrEqual(1);
    expect(await mailpit.waitForCount(request, email, 2)).toHaveLength(2);
    const r5 = await runWorker(request);
    expect(r5.sent).toBe(0);

    // Hapus dengan dialog konfirmasi.
    await page.reload();
    await page.getByTestId(`alert-delete-${alertId}`).click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('confirm-yes').click();
    await expect(page.getByTestId(`alert-item-${alertId}`)).toHaveCount(0);
  });

  test('alert kurs FX di atas target', async ({ page, request }) => {
    const email = await registerViaUi(page);
    const cookie = (await page.context().cookies()).find((c) => c.name === 'fxp_session')!.value;
    const headers = { cookie: `fxp_session=${cookie}` };

    // USD/IDR = 16.250 > 16.000 -> langsung terpenuhi.
    const created = await request.post(`${BASE_URL}/api/alerts`, {
      data: { type: 'fx', assetCode: 'USD', condition: 'above', target: 16000, currency: 'IDR' },
      headers,
    });
    expect(created.status()).toBe(201);

    // Validasi aturan bisnis: FX hanya IDR.
    const bad = await request.post(`${BASE_URL}/api/alerts`, {
      data: { type: 'fx', assetCode: 'USD', condition: 'above', target: 1, currency: 'USD' },
      headers,
    });
    expect(bad.status()).toBe(400);

    const r = await runWorker(request);
    expect(r.sent).toBeGreaterThanOrEqual(1);
    const mails = await mailpit.waitForCount(request, email, 1);
    expect(mails[0].Subject).toContain('USD / IDR di atas');

    const list = await request.get(`${BASE_URL}/api/alerts`, { headers });
    const { items } = await list.json();
    expect(items[0].status).toBe('triggered');
    expect(items[0].triggeredAt).toBeTruthy();
  });
});
