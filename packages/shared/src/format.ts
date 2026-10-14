/**
 * Util format angka dan waktu mengikuti Design System:
 * - Perubahan selalu disertai tanda (+/-) dan panah, bukan hanya warna.
 * - Angka memakai locale id-ID (titik ribuan, koma desimal).
 */

export type Trend = 'up' | 'down' | 'flat';

export function trendOf(changePct: number | null | undefined): Trend {
  if (changePct === null || changePct === undefined || Number.isNaN(changePct)) return 'flat';
  if (changePct > 0) return 'up';
  if (changePct < 0) return 'down';
  return 'flat';
}

/** Contoh: 0.42 -> "▲ +0,42%", -0.18 -> "▼ -0,18%", null -> "—". */
export function formatChangePct(changePct: number | null | undefined, locale = 'id-ID'): string {
  if (changePct === null || changePct === undefined || Number.isNaN(changePct)) return '—';
  const trend = trendOf(changePct);
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■';
  const sign = changePct > 0 ? '+' : changePct < 0 ? '-' : '';
  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(changePct));
  return `${arrow} ${sign}${num}%`;
}

/**
 * Format angka harga. Angka sangat besar (>= 1 juta, umumnya IDR) tanpa desimal,
 * angka menengah 2 desimal, angka kecil mempertahankan presisi agar harga token murah tetap terbaca.
 */
export function formatNumber(
  value: number | null | undefined,
  locale = 'id-ID',
  fractionDigits?: number,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const digits = fractionDigits ?? (abs >= 1_000_000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Kurs FX ditampilkan dengan 2 desimal, contoh "16.250,00". */
export function formatFxRate(value: number | null | undefined, locale = 'id-ID'): string {
  return formatNumber(value, locale, 2);
}

/** Contoh: "Rp1.410.000.000" atau "US$86.000,00". */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
  locale = 'id-ID',
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const cur = currency.toUpperCase();
  const abs = Math.abs(value);
  const digits = cur === 'IDR' ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${cur} ${formatNumber(value, locale, digits)}`;
  }
}

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** "2026-10-10" -> "10 Okt 2026". Dipakai untuk label tanggal ECB. */
export function formatDateId(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS_ID[Number(mo) - 1] ?? mo} ${y}`;
}

/** ISO timestamp -> "14:05 WIB" (zona Asia/Jakarta). */
export function formatTimeWib(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const fmt = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
  return `${fmt.format(d).replace('.', ':')} WIB`;
}

/** ISO timestamp -> "10 Okt 2026 14:05 WIB". */
export function formatDateTimeWib(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d); // YYYY-MM-DD
  return `${formatDateId(date)} ${formatTimeWib(iso)}`;
}

/** Persentase perubahan antara dua nilai, null jika pembagi 0/tidak valid. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0 || !Number.isFinite(previous))
    return null;
  return ((current - previous) / previous) * 100;
}

/** Membentuk isi CSV dari titik histori (F6). Kolom: date,value,range. */
export function historyToCsv(points: { date: string; value: number }[], range: number): string {
  const lines = ['date,value,range'];
  for (const p of points) lines.push(`${p.date},${p.value},${range}`);
  return lines.join('\n') + '\n';
}
