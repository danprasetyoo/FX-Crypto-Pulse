import { expect, test } from '@playwright/test';
import { registerViaUi, loginViaUi } from '../support/auth';
import { BASE_URL, PASSWORD, uniqueEmail } from '../support/env';
import { mailpit } from '../support/mailpit';
import { resetMarket } from '../support/mock';

/** FSD bagian 2: tamu vs pengguna terdaftar, sesi cookie httpOnly, reset password via email. */
test.describe('Autentikasi dan watchlist', () => {
  test.beforeAll(async ({ request }) => {
    await resetMarket(request);
  });

  test('tamu tidak bisa mengakses watchlist/alert: UI mengarahkan ke login, API 401', async ({
    page,
    request,
  }) => {
    await page.goto('/watchlist');
    await expect(page).toHaveURL(/\/login\?next=%2Fwatchlist/);
    await page.goto('/alerts');
    await expect(page).toHaveURL(/\/login\?next=%2Falerts/);

    for (const path of ['/api/watchlist', '/api/alerts', '/api/auth/me']) {
      const res = await request.get(`${BASE_URL}${path}`);
      expect(res.status(), path).toBe(401);
      expect((await res.json()).code).toBe('UNAUTHORIZED');
    }
    const post = await request.post(`${BASE_URL}/api/alerts`, {
      data: {
        type: 'crypto',
        assetCode: 'bitcoin',
        condition: 'below',
        target: 1,
        currency: 'IDR',
      },
    });
    expect(post.status()).toBe(401);
  });

  test('registrasi, keluar, masuk kembali; cookie sesi httpOnly', async ({ page, context }) => {
    const email = await registerViaUi(page);
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === 'fxp_session');
    expect(session).toBeDefined();
    expect(session!.httpOnly).toBe(true);
    expect(session!.sameSite).toBe('Lax');
    // Masa berlaku sekitar 7 hari.
    const days = (session!.expires - Date.now() / 1000) / 86400;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);

    await page.getByTestId('btn-logout').click();
    await expect(page.getByTestId('btn-login')).toBeVisible();
    expect((await context.cookies()).find((c) => c.name === 'fxp_session')).toBeUndefined();

    await loginViaUi(page, email);
  });

  test('email ganda ditolak, password salah ditolak, validasi password pendek', async ({
    page,
    request,
  }) => {
    const email = await registerViaUi(page);
    const dup = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: email.toUpperCase(), password: PASSWORD },
    });
    expect(dup.status()).toBe(409);
    expect((await dup.json()).code).toBe('EMAIL_TAKEN');

    const bad = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password: 'salah-sekali' },
    });
    expect(bad.status()).toBe(401);
    expect((await bad.json()).message).toBe('Email atau password salah.');

    const short = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: uniqueEmail(), password: 'pendek' },
    });
    expect(short.status()).toBe(400);
    expect((await short.json()).message).toContain('Password minimal 8 karakter');
  });

  test('watchlist: tambah, tampil dengan harga, tolak duplikat, hapus', async ({
    page,
    request,
  }) => {
    const email = await registerViaUi(page);
    await page.goto('/watchlist');
    await expect(page.getByTestId('empty-state')).toContainText('Belum ada aset di watchlist.');

    await page.getByTestId('btn-add-watchlist').click();
    await page.getByTestId('watchlist-asset').selectOption('bitcoin');
    await page.getByTestId('watchlist-submit').click();
    const item = page.getByTestId('watchlist-item-bitcoin');
    await expect(item).toContainText('Bitcoin');
    await expect(item).toContainText('Rp1.410.000.000');
    await expect(page.getByTestId('watchlist-alert-bitcoin')).toHaveText('Tanpa alert');

    // Duplikat via API -> 409 (pakai cookie dari sesi browser).
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === 'fxp_session')!;
    const dup = await request.post(`${BASE_URL}/api/watchlist`, {
      data: { type: 'crypto', assetCode: 'bitcoin' },
      headers: { cookie: `fxp_session=${session.value}` },
    });
    expect(dup.status()).toBe(409);

    // Tambah FX
    await page.getByTestId('btn-add-watchlist').click();
    await page.locator('#wl-type').selectOption('fx');
    await page.getByTestId('watchlist-asset').selectOption('USD');
    await page.getByTestId('watchlist-submit').click();
    await expect(page.getByTestId('watchlist-item-USD')).toContainText('16.250,00');

    // Tersimpan di server: muncul di dashboard setelah reload.
    await page.goto('/');
    await expect(
      page.getByTestId('watchlist-panel').getByTestId('watchlist-item-bitcoin'),
    ).toBeVisible();

    await page.getByTestId('watchlist-remove-bitcoin').click();
    await expect(page.getByTestId('watchlist-item-bitcoin')).toHaveCount(0);
    expect(email).toBeTruthy();
  });

  test('reset password lewat email: tautan sekali pakai, lalu login dengan password baru', async ({
    page,
    request,
  }) => {
    const email = await registerViaUi(page);
    await page.getByTestId('btn-logout').click();

    await page.goto('/reset-request');
    await page.getByTestId('auth-email').fill(email);
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('reset-sent')).toBeVisible();

    const mails = await mailpit.waitForCount(request, email, 1);
    expect(mails).toHaveLength(1);
    expect(mails[0].Subject).toContain('Reset password');
    const text = await mailpit.text(request, mails[0].ID);
    const link = /https?:\/\/[^\s"<]+\/reset\?token=[0-9a-f]{64}/.exec(text)?.[0];
    expect(link, 'email harus berisi tautan reset').toBeTruthy();

    const url = new URL(link!);
    await page.goto(`${url.pathname}${url.search}`);
    const newPassword = 'PasswordBaru456!';
    await page.getByTestId('auth-password').fill(newPassword);
    await page.getByTestId('auth-submit').click();
    await expect(page).toHaveURL(/\/login$/);

    // Token tidak bisa dipakai dua kali.
    const token = url.searchParams.get('token')!;
    const reuse = await request.post(`${BASE_URL}/api/auth/reset-confirm`, {
      data: { token, password: 'LagiLagi789!' },
    });
    expect(reuse.status()).toBe(400);

    // Password lama ditolak, baru diterima.
    const old = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(old.status()).toBe(401);
    await loginViaUi(page, email, newPassword);
  });

  test('reset untuk email tidak terdaftar tetap 202 tanpa email terkirim', async ({ request }) => {
    const ghost = uniqueEmail('ghost');
    const res = await request.post(`${BASE_URL}/api/auth/reset-request`, {
      data: { email: ghost },
    });
    expect(res.status()).toBe(202);
    await new Promise((r) => setTimeout(r, 1500));
    expect(await mailpit.forRecipient(request, ghost)).toHaveLength(0);
  });
});
