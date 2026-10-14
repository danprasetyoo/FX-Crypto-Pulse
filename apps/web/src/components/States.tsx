import type { ReactNode } from 'react';
import { ERROR_NO_DATA } from '../lib/labels';

/** Skeleton baris tabel: tanpa spinner penuh layar (Design System bagian 7). */
export function SkeletonRows({ rows = 3, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <tbody data-testid="skeleton">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}>
              <span
                className="skeleton"
                style={{ width: c === 0 ? '60%' : '40%', marginLeft: c === 0 ? 0 : 'auto' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function SkeletonBlock({
  height = 14,
  width = '100%',
}: {
  height?: number;
  width?: string;
}) {
  return <span className="skeleton" style={{ height, width }} />;
}

/** Error upstream tanpa cache: ikon peringatan dan tombol coba lagi. */
export function ErrorState({
  message = ERROR_NO_DATA,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role="alert" data-testid="error-state">
      <span className="state__icon" aria-hidden="true">
        ⚠️
      </span>
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="state" data-testid="empty-state">
      <span className="state__icon" aria-hidden="true">
        ☆
      </span>
      <span>{text}</span>
      {action}
    </div>
  );
}
