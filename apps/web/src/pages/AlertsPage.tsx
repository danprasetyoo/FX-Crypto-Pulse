import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTimeWib, formatMoney, type Alert } from '@fxpulse/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RequireAuth } from '../components/RequireAuth';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/States';
import { useToast } from '../components/Toast';
import { ApiClientError } from '../lib/api';
import { ALERT_STATUS_LABEL, fxPairLabel } from '../lib/labels';
import { useAlerts, useCryptoTop, useRemoveAlert, useUpdateAlert } from '../lib/queries';

function AlertList() {
  const alerts = useAlerts(true);
  const top = useCryptoTop();
  const update = useUpdateAlert();
  const remove = useRemoveAlert();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<Alert | null>(null);

  const nameOf = (a: Alert) =>
    a.type === 'fx'
      ? fxPairLabel(a.assetCode)
      : (top.data?.data.assets.find((c) => c.id === a.assetCode)?.name ?? a.assetCode);

  const onError = (err: unknown) =>
    toast.error(err instanceof ApiClientError ? err.message : 'Terjadi kesalahan.');

  if (alerts.isLoading) return <SkeletonBlock height={120} />;
  if (alerts.isError)
    return (
      <ErrorState message="Daftar alert tidak dapat dimuat." onRetry={() => alerts.refetch()} />
    );
  const items = alerts.data?.items ?? [];

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          text="Belum ada alert."
          action={
            <Link to="/alerts/new" className="btn btn--primary btn--sm">
              Buat alert
            </Link>
          }
        />
      ) : (
        <ul className="wl-list" data-testid="alert-list">
          {items.map((a) => (
            <li
              key={a.id}
              className="wl-item"
              data-testid={`alert-item-${a.id}`}
              data-status={a.status}
            >
              <div>
                <div className="wl-item__name">
                  {nameOf(a)} {a.condition === 'above' ? 'di atas' : 'di bawah'}{' '}
                  <span className="num">{formatMoney(a.target, a.currency)}</span>
                </div>
                <div className="wl-item__sub">
                  <span
                    className={`badge badge--status badge--${a.status}`}
                    data-testid={`alert-status-${a.id}`}
                  >
                    {ALERT_STATUS_LABEL[a.status]}
                  </span>{' '}
                  {a.triggeredAt && <span>Terpicu {formatDateTimeWib(a.triggeredAt)}</span>}
                </div>
              </div>
              <div className="wl-item__right">
                {a.status !== 'active' ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    data-testid={`alert-reactivate-${a.id}`}
                    onClick={() =>
                      update.mutate(
                        { id: a.id, input: { status: 'active' } },
                        { onSuccess: () => toast.success('Alert diaktifkan kembali.'), onError },
                      )
                    }
                  >
                    Aktifkan kembali
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--sm"
                    data-testid={`alert-deactivate-${a.id}`}
                    onClick={() =>
                      update.mutate(
                        { id: a.id, input: { status: 'inactive' } },
                        { onSuccess: () => toast.success('Alert dinonaktifkan.'), onError },
                      )
                    }
                  >
                    Nonaktifkan
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label="Hapus alert"
                  data-testid={`alert-delete-${a.id}`}
                  onClick={() => setToDelete(a)}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus alert?"
        description={toDelete ? `Alert ${nameOf(toDelete)} akan dihapus permanen.` : ''}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id, { onSuccess: () => toast.success('Alert dihapus.'), onError });
          setToDelete(null);
        }}
      />
    </>
  );
}

export function AlertsPage() {
  return (
    <RequireAuth>
      <div className="card form-narrow" data-testid="alerts-page">
        <div className="card__body">
          <div className="chart-tools">
            <h1 className="page-title">Alert harga</h1>
            <Link to="/alerts/new" className="btn btn--primary btn--sm">
              Buat alert
            </Link>
          </div>
          <AlertList />
          <p className="small muted">
            Alert dicek tiap 5 menit. Notifikasi dikirim tepat sekali lalu alert nonaktif. Data
            hanya informasi, bukan saran investasi.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
