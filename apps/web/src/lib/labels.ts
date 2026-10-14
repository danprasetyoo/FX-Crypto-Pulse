import {
  formatDateId,
  formatMoney,
  formatTimeWib,
  type Alert,
  type ApiEnvelope,
} from '@fxpulse/shared';

/** Teks status data mengikuti Design System bagian 7. */

export function fxDateLabel(date: string): string {
  return `Kurs ECB per ${formatDateId(date)}`;
}

export function updatedLabel(iso: string): string {
  return `Diperbarui ${formatTimeWib(iso)}`;
}

export function staleLabel(iso: string): string {
  return `Data terakhir ${formatTimeWib(iso)}. Sumber sedang tidak tersedia.`;
}

export function envelopeLabel(env: Pick<ApiEnvelope<unknown>, 'updatedAt' | 'stale'>): string {
  return env.stale ? staleLabel(env.updatedAt) : updatedLabel(env.updatedAt);
}

export const ERROR_NO_DATA = 'Data belum tersedia. Coba lagi beberapa saat.';
export const EMPTY_WATCHLIST = 'Belum ada aset di watchlist.';

/** "Rp900 jt", "Rp1,41 M", "US$86 rb". Dipakai di badge alert watchlist. */
export function compactMoney(value: number, currency: string): string {
  const cur = currency.toUpperCase();
  const prefix = cur === 'IDR' ? 'Rp' : cur === 'USD' ? 'US$' : `${cur} `;
  const abs = Math.abs(value);
  const fmt = (n: number, suffix: string) =>
    `${prefix}${new Intl.NumberFormat('id-ID', { maximumFractionDigits: n < 10 ? 2 : n < 100 ? 1 : 0 }).format(n)} ${suffix}`;
  if (abs >= 1e12) return fmt(value / 1e12, 'T');
  if (abs >= 1e9) return fmt(value / 1e9, 'M');
  if (abs >= 1e6) return fmt(value / 1e6, 'jt');
  if (abs >= 1e3) return fmt(value / 1e3, 'rb');
  return formatMoney(value, cur);
}

export function alertSummary(a: Alert): string {
  return `${a.condition === 'above' ? 'di atas' : 'di bawah'} ${compactMoney(a.target, a.currency)}`;
}

export const ALERT_STATUS_LABEL: Record<Alert['status'], string> = {
  active: 'Aktif',
  triggered: 'Terpicu',
  inactive: 'Nonaktif',
};

export function fxPairLabel(quote: string, base = 'IDR'): string {
  return `${quote} / ${base}`;
}
