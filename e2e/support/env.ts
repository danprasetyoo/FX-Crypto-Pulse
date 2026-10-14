export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
export const MOCK_URL = process.env.E2E_MOCK_URL ?? 'http://localhost:4000';
export const WORKER_URL = process.env.E2E_WORKER_URL ?? 'http://localhost:3003';

/** Alamat email unik per test agar data tidak saling mengganggu. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

export const PASSWORD = 'Password123!';
