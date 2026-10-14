import type { ApiEnvelope } from '@fxpulse/shared';
import { staleLabel, updatedLabel } from '../lib/labels';

interface Props {
  env?: Pick<ApiEnvelope<unknown>, 'updatedAt' | 'stale' | 'source'> | null;
  /** Teks pengganti untuk mode normal, misal "Kurs ECB per 10 Okt 2026". */
  normalText?: string;
  testId?: string;
}

/**
 * Badge waktu data (Design System bagian 4 dan 7).
 * Normal: "Diperbarui 14:05 WIB" / teks khusus. Stale: warna warn + ikon jam.
 */
export function DataBadge({ env, normalText, testId }: Props) {
  if (!env) return <span className="badge" data-testid={testId} data-state="loading" />;
  if (env.stale) {
    return (
      <span
        className="badge badge--stale"
        data-testid={testId}
        data-state="stale"
        title={staleLabel(env.updatedAt)}
      >
        <span aria-hidden="true">🕒</span>
        {staleLabel(env.updatedAt)}
      </span>
    );
  }
  return (
    <span className="badge" data-testid={testId} data-state="live" data-source={env.source}>
      {normalText ?? updatedLabel(env.updatedAt)}
    </span>
  );
}
