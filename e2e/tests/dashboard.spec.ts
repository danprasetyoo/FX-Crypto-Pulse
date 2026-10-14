import { expect, test } from '@playwright/test';
import { resetMarket } from '../support/mock';

/**
 * F1, F2, F3, F6 untuk tamu: dashboard tampil dengan label waktu data di setiap angka,
 * rentang grafik bisa diganti tanpa reload, tabel data dan CSV tersedia.
 */
test.describe('Dashboard tamu', () => {
  test.beforeAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('kurs FX tampil dengan tanggal ECB dan perubahan harian bertanda', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('fx-badge')).toHaveAttribute('data-state', 'live');
    await expect(page.getByTestId('fx-badge')).toContainText(/Kurs ECB per \d{1,2} \w{3} \d{4}/);

    const usd = page.getByTestId('fx-row-USD');
    await expect(usd).toContainText('USD / IDR');
    await expect(page.getByTestId('fx-rate-USD')).toHaveText('16.250,00');
    await expect(page.getByTestId('fx-change-USD')).toHaveText('▲ +0,42%');
    await expect(page.getByTestId('fx-change-USD')).toHaveAttribute('data-trend', 'up');

    // Penurunan memakai panah bawah dan tanda minus, bukan hanya warna.
    await expect(page.getByTestId('fx-change-SGD')).toHaveText(/^▼ -\d+,\d{2}%$/);

    await expect(page.getByTestId('status-line')).toContainText('Kurs ECB per');
    await expect(page.getByTestId('status-line')).toContainText('Harga kripto diperbarui');
  });

  test('top-20 kripto tampil dengan harga IDR, USD, dan waktu diperbarui', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('crypto-badge')).toHaveAttribute('data-state', 'live');
    await expect(page.getByTestId('crypto-badge')).toContainText(/Diperbarui \d{2}:\d{2} WIB/);

    const rows = page.getByTestId('crypto-table').locator('tbody tr');
    await expect(rows).toHaveCount(20);
    await expect(page.getByTestId('crypto-row-bitcoin')).toContainText('Bitcoin');
    await expect(page.getByTestId('crypto-idr-bitcoin')).toHaveText('1.410.000.000');
    await expect(page.getByTestId('crypto-usd-bitcoin')).toHaveText('86.769,23');
    await expect(page.getByTestId('crypto-change-bitcoin')).toHaveText('▲ +1,20%');
    await expect(page.getByTestId('crypto-change-ethereum')).toHaveText('▼ -0,64%');
  });

  test('disclaimer tampil di footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('disclaimer')).toContainText('bukan saran investasi');
  });

  test('rentang grafik 30/90/365 berganti tanpa memuat ulang halaman', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as unknown as { __marker: number }).__marker = 42;
    });
    const chart = page.getByTestId('chart');
    await expect(chart).toHaveAttribute('data-range', '90');
    await expect(page.getByTestId('range-90')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('range-30').click();
    await expect(page.getByTestId('range-30')).toHaveAttribute('aria-pressed', 'true');
    await expect(chart).toHaveAttribute('data-range', '30');
    const points30 = Number(await chart.getAttribute('data-points'));
    expect(points30).toBeGreaterThanOrEqual(28);
    expect(points30).toBeLessThanOrEqual(32);

    await page.getByTestId('range-365').click();
    await expect(chart).toHaveAttribute('data-range', '365');
    const points365 = Number(await chart.getAttribute('data-points'));
    expect(points365).toBeGreaterThan(300);

    // Tidak ada reload: variabel yang kita set masih ada.
    expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(
      42,
    );

    // Teks alternatif menyebut rentang dan perubahan persen.
    await expect(page.getByTestId('chart-alt')).toContainText('365 hari');
    await expect(page.getByTestId('chart-alt')).toContainText('%');
  });

  test('grafik FX juga tersedia dengan rentang yang sama', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('chart-asset').selectOption('fx:USD-IDR');
    const chart = page.getByTestId('chart');
    await expect(chart).toHaveAttribute('data-range', '90');
    await expect(page.getByTestId('chart-alt')).toContainText('USD / IDR');
    // Hari kerja dalam 90 hari: sekitar 64.
    const pts = Number(await chart.getAttribute('data-points'));
    expect(pts).toBeGreaterThan(55);
    expect(pts).toBeLessThan(70);
  });

  test('"Lihat data" menampilkan tabel dan "Unduh CSV" menghasilkan file dengan tanggal, nilai, rentang', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('range-30').click();
    await expect(page.getByTestId('chart')).toHaveAttribute('data-range', '30');

    await page.getByTestId('btn-view-data').click();
    const table = page.getByTestId('history-table');
    await expect(table).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBeGreaterThanOrEqual(28);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('btn-download-csv').click(),
    ]);
    expect(download.suggestedFilename()).toBe('bitcoin-30d.csv');
    const path = await download.path();
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(path!, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines[0]).toBe('date,value,range');
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2},[\d.]+,30$/);
    expect(lines.length).toBeGreaterThanOrEqual(29);
  });
});
