import { formatNumber } from '@fxpulse/shared';
import { useCryptoTop } from '../lib/queries';
import { ChangeCell } from './ChangeCell';
import { DataBadge } from './DataBadge';
import { ErrorState, SkeletonRows } from './States';

/** Tabel top-20 kripto (F2): harga IDR, USD, perubahan 24 jam, waktu terakhir diperbarui. */
export function CryptoTable({ compact = false }: { compact?: boolean }) {
  const q = useCryptoTop();
  const env = q.data;

  return (
    <section className="card grow-main" aria-labelledby="crypto-title" data-testid="crypto-card">
      <div className="card__head">
        <h2 id="crypto-title" className="card__title">
          Top kripto
        </h2>
        <DataBadge env={env} testId="crypto-badge" />
      </div>
      {q.isError && !env ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="table-wrap">
          <table data-testid="crypto-table">
            <thead>
              <tr>
                <th scope="col">Aset</th>
                <th scope="col" className="right">
                  Harga IDR
                </th>
                {!compact && (
                  <th scope="col" className="right">
                    Harga USD
                  </th>
                )}
                <th scope="col" className="right">
                  24 jam
                </th>
              </tr>
            </thead>
            {env ? (
              <tbody>
                {env.data.assets.map((a) => (
                  <tr key={a.id} data-testid={`crypto-row-${a.id}`}>
                    <td>
                      <span className="asset-cell">
                        {a.image && (
                          <img src={a.image} alt="" width={20} height={20} loading="lazy" />
                        )}
                        <span>
                          {a.name}{' '}
                          <span className="asset-cell__sym">({a.symbol.toUpperCase()})</span>
                        </span>
                      </span>
                    </td>
                    <td className="right num" data-testid={`crypto-idr-${a.id}`}>
                      {formatNumber(a.price.idr)}
                    </td>
                    {!compact && (
                      <td className="right num" data-testid={`crypto-usd-${a.id}`}>
                        {formatNumber(a.price.usd)}
                      </td>
                    )}
                    <td className="right">
                      <ChangeCell
                        value={a.change24hPct.idr ?? a.change24hPct.usd}
                        testId={`crypto-change-${a.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <SkeletonRows rows={8} cols={compact ? 3 : 4} />
            )}
          </table>
        </div>
      )}
      <p className="card__note">Harga diperbarui setiap 60 detik. Bukan saran investasi.</p>
    </section>
  );
}
