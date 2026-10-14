import { historyToCsv } from '@fxpulse/shared';

/** Ekspor CSV (F6) dibuat di frontend dari data yang sudah dimuat. */
export function downloadHistoryCsv(
  points: { date: string; value: number }[],
  range: number,
  name: string,
): void {
  const csv = historyToCsv(points, range);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${range}d.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
