import { expect, test } from '@playwright/test';
import { resetMarket } from '../support/mock';

/** Layout mobile (Design System bagian 5, mockup Beranda): area bertumpuk, tab bawah. */
test.describe('Mobile', () => {
  test.beforeAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('beranda bertumpuk, tab bawah tampil, grafik 240 px, tanpa scroll horizontal', async ({
    page,
  }) => {
    await page.goto('/');
    const tabbar = page.getByRole('navigation', { name: 'Navigasi bawah' });
    await expect(tabbar).toBeVisible();
    await expect(tabbar.getByRole('link', { name: 'Beranda' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await expect(page.getByTestId('fx-rate-USD')).toHaveText('16.250,00');
    await expect(page.getByTestId('crypto-row-bitcoin')).toBeVisible();

    const fx = await page.getByTestId('fx-card').boundingBox();
    const crypto = await page.getByTestId('crypto-card').boundingBox();
    expect(fx!.y).toBeLessThan(crypto!.y);

    const chartBox = await page.getByTestId('chart').boundingBox();
    expect(Math.round(chartBox!.height)).toBe(240);

    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHScroll).toBe(false);
  });

  test('tab Grafik, Konverter, dan Akun bekerja', async ({ page }) => {
    await page.goto('/');
    const tabbar = page.getByRole('navigation', { name: 'Navigasi bawah' });
    await tabbar.getByRole('link', { name: 'Grafik' }).click();
    await expect(page.getByTestId('chart')).toBeVisible();
    await tabbar.getByRole('link', { name: 'Konverter' }).click();
    await expect(page.getByTestId('converter')).toBeVisible();
    await tabbar.getByRole('link', { name: 'Akun' }).click();
    await expect(page.getByTestId('account-page')).toContainText(
      'Masuk untuk menyimpan watchlist dan alert.',
    );
  });
});
