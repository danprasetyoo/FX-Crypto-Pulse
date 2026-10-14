import { HISTORY_RANGES, type HistoryRange } from '@fxpulse/shared';
import { BadRequestError } from './errors';

/** Parsing parameter query yang dipakai berulang di controller. */

export function parseList(
  raw: unknown,
  fallback: string[],
  transform: (s: string) => string,
): string[] {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const str = Array.isArray(raw) ? raw.join(',') : String(raw);
  const items = str
    .split(',')
    .map((s) => transform(s.trim()))
    .filter(Boolean);
  return Array.from(new Set(items));
}

export function parseRange(raw: unknown, fallback: HistoryRange = 30): HistoryRange {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!(HISTORY_RANGES as readonly number[]).includes(n)) {
    throw new BadRequestError(`Rentang harus salah satu dari ${HISTORY_RANGES.join(', ')} hari.`, {
      allowed: HISTORY_RANGES,
    });
  }
  return n as HistoryRange;
}

export function parseCurrencyCode(raw: unknown, name: string): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(s)) {
    throw new BadRequestError(`Parameter ${name} harus kode mata uang 3 huruf, contoh USD.`);
  }
  return s;
}

export function parseAmount(raw: unknown): number {
  const n = Number(raw);
  if (raw === undefined || raw === '' || !Number.isFinite(n) || n < 0) {
    throw new BadRequestError('Nominal harus angka positif.');
  }
  return n;
}

/** ID CoinGecko: huruf kecil, angka, dan tanda hubung. */
export function parseCoinId(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) {
    throw new BadRequestError('Parameter id aset kripto tidak valid.');
  }
  return s;
}
