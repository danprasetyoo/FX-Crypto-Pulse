import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { BASE_URL, PASSWORD, uniqueEmail } from './env';

/** Registrasi lewat UI; mengembalikan email yang dipakai. */
export async function registerViaUi(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto('/register');
  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(PASSWORD);
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('header-email')).toHaveText(email);
  return email;
}

/** Registrasi lewat API (lebih cepat) dan menyuntikkan cookie sesi ke konteks browser. */
export async function registerViaApi(
  request: APIRequestContext,
  email = uniqueEmail(),
): Promise<{ email: string; cookie: string }> {
  const res = await request.post(`${BASE_URL}/api/auth/register`, {
    data: { email, password: PASSWORD },
  });
  expect(res.status(), await res.text()).toBe(201);
  const setCookie = res.headers()['set-cookie'] ?? '';
  const m = /fxp_session=([^;]+)/.exec(setCookie);
  expect(m, 'cookie sesi harus ada').not.toBeNull();
  return { email, cookie: m![1] };
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('header-email')).toHaveText(email);
}
