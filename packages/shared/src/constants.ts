import type { HistoryRange } from './api.js';

/** Rentang grafik yang didukung (PRD F3). */
export const HISTORY_RANGES: readonly HistoryRange[] = [30, 90, 365] as const;

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === 'number' && (HISTORY_RANGES as readonly number[]).includes(value);
}

/** Pasangan FX default di dashboard (PRD: kurs IDR terhadap USD, EUR, SGD, dll.). */
export const DEFAULT_FX_BASE = 'IDR';
export const DEFAULT_FX_QUOTES = ['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'AUD', 'CNY'] as const;

/** Mata uang kuotasi kripto yang ditampilkan (PRD F2). */
export const CRYPTO_VS_CURRENCIES = ['idr', 'usd'] as const;
export const CRYPTO_TOP_LIMIT = 20;

/** Mata uang yang boleh dipakai sebagai target alert. */
export const ALERT_CURRENCIES = ['IDR', 'USD'] as const;

/** Nama cookie sesi JWT (FSD bagian 2: httpOnly, 7 hari). */
export const SESSION_COOKIE = 'fxp_session';

/** Teks disclaimer yang wajib tampil di halaman harga dan alert. */
export const DISCLAIMER_TEXT =
  'Data hanya informasi, bukan saran investasi. Sumber: Frankfurter (ECB) dan CoinGecko.';
