import { defineConfig, devices } from '@playwright/test';

/**
 * E2E berjalan terhadap stack yang sudah hidup (docker compose + docker-compose.e2e.yml,
 * atau scripts/local-stack.mjs). Alamat diambil dari env:
 *   E2E_BASE_URL      gateway (default http://localhost:8080)
 *   E2E_MAILPIT_URL   API Mailpit (default http://localhost:8025)
 *   E2E_MOCK_URL      mock-upstream (default http://localhost:4000)
 *   E2E_WORKER_URL    admin alert-worker (default http://localhost:3003)
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
