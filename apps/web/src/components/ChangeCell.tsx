import { formatChangePct, trendOf } from '@fxpulse/shared';

/** Perubahan selalu dengan tanda dan panah; warna hanya pelengkap (Design System prinsip 3). */
export function ChangeCell({
  value,
  testId,
}: {
  value: number | null | undefined;
  testId?: string;
}) {
  const trend = trendOf(value);
  const label = trend === 'up' ? 'naik' : trend === 'down' ? 'turun' : 'tidak berubah';
  return (
    <span
      className={`change change--${trend} num`}
      data-testid={testId}
      data-trend={trend}
      aria-label={`${label} ${formatChangePct(value)}`}
    >
      {formatChangePct(value)}
    </span>
  );
}
