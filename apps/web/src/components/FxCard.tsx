import { formatFxRate } from '@fxpulse/shared';
import { useFxLatest } from '../lib/queries';
import { fxDateLabel, fxPairLabel } from '../lib/labels';
import { ChangeCell } from './ChangeCell';
import { DataBadge } from './DataBadge';
import { ErrorState, SkeletonRows } from './States';

/** Kartu kurs (F1): nilai, tanggal data ECB, dan perubahan % terhadap hari kerja sebelumnya. */
export function FxCard() {
  const q = useFxLatest();
  const env = q.data;

  return (
    <section className="card grow-main" aria-labelledby="fx-title" data-testid="fx-card">
      <div className="card__head">
        <h2 id="fx-title" className="card__title">
          Kurs terbaru (basis IDR)
        </h2>
        <DataBadge
          env={env}
          normalText={env ? fxDateLabel(env.data.date) : undefined}
          testId="fx-badge"
        />
      </div>
      {q.isError && !env ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="table-wrap">
          <table data-testid="fx-table">
            <thead>
              <tr>
                <th scope="col">Pasangan</th>
                <th scope="col" className="right">
                  Kurs
                </th>
                <th scope="col" className="right">
                  Perubahan harian
                </th>
              </tr>
            </thead>
            {env ? (
              <tbody>
                {env.data.rates.map((r) => (
                  <tr key={r.quote} data-testid={`fx-row-${r.quote}`}>
                    <td>{fxPairLabel(r.quote, r.base)}</td>
                    <td className="right num" data-testid={`fx-rate-${r.quote}`}>
                      {formatFxRate(r.rate)}
                    </td>
                    <td className="right">
                      <ChangeCell value={r.changePct} testId={`fx-change-${r.quote}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <SkeletonRows rows={5} />
            )}
          </table>
        </div>
      )}
      <p className="card__note">
        Kurs referensi ECB, diperbarui sekali sehari pada hari kerja. Bukan harga real-time.
      </p>
    </section>
  );
}
