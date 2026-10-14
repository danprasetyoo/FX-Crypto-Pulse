import { expect, test } from '@playwright/test';
import { BASE_URL } from '../support/env';
import { resetMarket } from '../support/mock';

/** F5: konverter memakai data cache terbaru dan menampilkan waktu data. */
test.describe('Konverter', () => {
  test.beforeAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('100 USD ke IDR = 1.625.000 dengan badge waktu data', async ({ page }) => {
    await page.goto('/convert');
    await page.getByTestId('convert-amount').fill('100');
    await page.getByTestId('convert-from').selectOption('USD');
    await page.getByTestId('convert-to').selectOption('IDR');
    await expect(page.getByTestId('convert-result')).toHaveText('1.625.000 IDR');
    await expect(page.getByTestId('convert-rate')).toHaveText('16.250,00');
    await expect(page.getByTestId('convert-badge')).toHaveAttribute('data-state', 'live');
    await expect(page.getByTestId('convert-badge')).toContainText(/Diperbarui \d{2}:\d{2} WIB/);
  });

  test('kripto ke mata uang dan sebaliknya', async ({ page }) => {
    await page.goto('/convert');
    await page.getByTestId('convert-amount').fill('1');
    await page.getByTestId('convert-from').selectOption('bitcoin');
    await page.getByTestId('convert-to').selectOption('USD');
    await expect(page.getByTestId('convert-result')).toHaveText('86.769,23 USD');

    await page.getByTestId('convert-from').selectOption('IDR');
    await page.getByTestId('convert-to').selectOption('bitcoin');
    await page.getByTestId('convert-amount').fill('1410000000');
    await expect(page.getByTestId('convert-result')).toHaveText(/^1,00/);
  });

  test('nominal tidak valid menampilkan pesan error', async ({ page }) => {
    await page.goto('/convert');
    await page.getByTestId('convert-amount').fill('abc');
    await expect(page.getByText('Nominal harus angka positif.')).toBeVisible();
  });

  test('API: aset kripto di luar top-20 ditolak dengan pesan jelas', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/convert?from=unknown-coin&to=IDR&amount=1`);
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe('ASSET_NOT_AVAILABLE');
  });
});
