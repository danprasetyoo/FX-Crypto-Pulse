import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_FX_QUOTES,
  formatFxRate,
  formatNumber,
  type Alert,
  type AssetType,
  type WatchlistItem,
} from '@fxpulse/shared';
import {
  useAddWatchlist,
  useAlerts,
  useCryptoTop,
  useFxLatest,
  useMe,
  useRemoveWatchlist,
  useWatchlist,
} from '../lib/queries';
import { EMPTY_WATCHLIST, alertSummary, fxPairLabel } from '../lib/labels';
import { ApiClientError } from '../lib/api';
import { EmptyState, SkeletonBlock } from './States';
import { useToast } from './Toast';

interface PriceInfo {
  label: string;
  value: string;
}

/** Panel watchlist (F4 + F2): item dengan harga terkini dan badge alert aktif. */
export function WatchlistPanel({ asPage = false }: { asPage?: boolean }) {
  const me = useMe();
  const loggedIn = Boolean(me.data);
  const wl = useWatchlist(loggedIn);
  const alerts = useAlerts(loggedIn);
  const fx = useFxLatest();
  const top = useCryptoTop();
  const add = useAddWatchlist();
  const remove = useRemoveWatchlist();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<AssetType>('crypto');
  const [code, setCode] = useState('bitcoin');

  const priceFor = useMemo(() => {
    const fxMap = new Map((fx.data?.data.rates ?? []).map((r) => [r.quote, r.rate]));
    const cMap = new Map((top.data?.data.assets ?? []).map((a) => [a.id, a]));
    return (item: WatchlistItem): PriceInfo => {
      if (item.type === 'fx') {
        const rate = fxMap.get(item.assetCode);
        return {
          label: fxPairLabel(item.assetCode),
          value: rate === undefined ? '—' : formatFxRate(rate),
        };
      }
      const a = cMap.get(item.assetCode);
      return {
        label: a?.name ?? item.assetCode,
        value: a ? `Rp${formatNumber(a.price.idr)}` : '—',
      };
    };
  }, [fx.data, top.data]);

  const activeAlertFor = (item: WatchlistItem): Alert | undefined =>
    alerts.data?.items.find(
      (a) => a.status === 'active' && a.type === item.type && a.assetCode === item.assetCode,
    );

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    add.mutate(
      { type, assetCode: code },
      {
        onSuccess: () => {
          toast.success('Aset ditambahkan ke watchlist.');
          setAdding(false);
        },
        onError: (err) =>
          toast.error(err instanceof ApiClientError ? err.message : 'Gagal menambah aset.'),
      },
    );
  };

  const className = asPage ? 'card' : 'card aside';

  return (
    <aside className={className} aria-labelledby="wl-title" data-testid="watchlist-panel">
      <div className="card__body">
        <h2 id="wl-title" className="card__title">
          Watchlist
        </h2>
        {!loggedIn ? (
          me.isLoading ? (
            <SkeletonBlock height={60} />
          ) : (
            <EmptyState
              text="Masuk untuk menyimpan watchlist dan alert di akun Anda."
              action={
                <Link to="/login?next=/watchlist" className="btn btn--primary btn--sm">
                  Masuk
                </Link>
              }
            />
          )
        ) : wl.isLoading ? (
          <SkeletonBlock height={60} />
        ) : (wl.data?.items.length ?? 0) === 0 && !adding ? (
          <EmptyState
            text={EMPTY_WATCHLIST}
            action={
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setAdding(true)}
                data-testid="btn-add-watchlist"
              >
                + Tambah aset
              </button>
            }
          />
        ) : (
          <ul className="wl-list">
            {wl.data?.items.map((item) => {
              const p = priceFor(item);
              const alert = activeAlertFor(item);
              return (
                <li
                  key={item.id}
                  className="wl-item"
                  data-testid={`watchlist-item-${item.assetCode}`}
                >
                  <div>
                    <div className="wl-item__name">{p.label}</div>
                    <div
                      className={`wl-item__sub ${alert ? 'wl-item__sub--alert' : ''}`}
                      data-testid={`watchlist-alert-${item.assetCode}`}
                    >
                      {alert ? `Alert aktif: ${alertSummary(alert)}` : 'Tanpa alert'}
                    </div>
                  </div>
                  <div className="wl-item__right">
                    <span className="num" style={{ fontSize: 14 }}>
                      {p.value}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      aria-label={`Hapus ${p.label} dari watchlist`}
                      data-testid={`watchlist-remove-${item.assetCode}`}
                      onClick={() =>
                        remove.mutate(item.id, {
                          onSuccess: () => toast.success('Aset dihapus dari watchlist.'),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {loggedIn && adding && (
          <form className="stack" onSubmit={onAdd} data-testid="watchlist-form">
            <div className="field">
              <label htmlFor="wl-type">Jenis</label>
              <select
                id="wl-type"
                className="select"
                value={type}
                onChange={(e) => {
                  const t = e.target.value as AssetType;
                  setType(t);
                  setCode(t === 'fx' ? 'USD' : 'bitcoin');
                }}
              >
                <option value="crypto">Kripto</option>
                <option value="fx">Kurs FX</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="wl-asset">Aset</label>
              <select
                id="wl-asset"
                className="select"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="watchlist-asset"
              >
                {type === 'fx'
                  ? DEFAULT_FX_QUOTES.map((q) => (
                      <option key={q} value={q}>
                        {fxPairLabel(q)}
                      </option>
                    ))
                  : (
                      top.data?.data.assets ?? [{ id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' }]
                    ).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.symbol.toUpperCase()})
                      </option>
                    ))}
              </select>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={add.isPending}
                data-testid="watchlist-submit"
              >
                Simpan
              </button>
              <button type="button" className="btn btn--sm" onClick={() => setAdding(false)}>
                Batal
              </button>
            </div>
          </form>
        )}

        {loggedIn && !adding && (wl.data?.items.length ?? 0) > 0 && (
          <button
            type="button"
            className="btn btn--dashed"
            onClick={() => setAdding(true)}
            data-testid="btn-add-watchlist"
          >
            + Tambah aset
          </button>
        )}
      </div>
    </aside>
  );
}
