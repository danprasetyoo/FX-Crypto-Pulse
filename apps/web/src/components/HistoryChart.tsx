import { useEffect, useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  DEFAULT_FX_QUOTES,
  HISTORY_RANGES,
  formatDateId,
  formatNumber,
  pctChange,
  type HistoryPoint,
  type HistoryRange,
} from '@fxpulse/shared';
import { useCryptoHistory, useCryptoTop, useFxHistory } from '../lib/queries';
import { downloadHistoryCsv } from '../lib/csv';
import { envelopeLabel } from '../lib/labels';
import { DataBadge } from './DataBadge';
import { ErrorState, SkeletonBlock } from './States';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export type ChartAsset =
  { kind: 'crypto'; id: string; label: string } | { kind: 'fx'; pair: string; label: string };

const FX_ASSETS: ChartAsset[] = DEFAULT_FX_QUOTES.map((q) => ({
  kind: 'fx',
  pair: `${q}-IDR`,
  label: `${q} / IDR`,
}));

function cssVar(name: string): string {
  if (typeof window === 'undefined') return '#1d4ed8';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#1d4ed8';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

interface Props {
  /** Aset awal; default Bitcoin dalam IDR seperti mockup. */
  initialAsset?: ChartAsset;
}

/**
 * Grafik historis (F3) dengan rentang 30/90/365 hari, tabel data tersembunyi,
 * dan ekspor CSV (F6). Aturan Design System bagian 6:
 * - Sumbu Y mulai dari nilai minimum data (bukan nol).
 * - Tooltip memuat tanggal + nilai; untuk FX menyebut kurs referensi ECB.
 * - Teks alternatif menyebut rentang, nilai awal, akhir, dan perubahan %.
 * - Animasi maksimal 300 ms; nol bila prefers-reduced-motion.
 */
export function HistoryChart({ initialAsset }: Props) {
  const top = useCryptoTop();
  const cryptoAssets = useMemo<ChartAsset[]>(
    () =>
      (top.data?.data.assets ?? [{ id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' }]).map((a) => ({
        kind: 'crypto',
        id: a.id,
        label: `${a.name} (${a.symbol.toUpperCase()})`,
      })),
    [top.data],
  );
  const [asset, setAsset] = useState<ChartAsset>(
    initialAsset ?? { kind: 'crypto', id: 'bitcoin', label: 'Bitcoin (BTC)' },
  );
  const [range, setRange] = useState<HistoryRange>(90);
  const [showTable, setShowTable] = useState(false);

  const fxQ = useFxHistory(
    asset.kind === 'fx' ? asset.pair : 'USD-IDR',
    range,
    asset.kind === 'fx',
  );
  const cryptoQ = useCryptoHistory(
    asset.kind === 'crypto' ? asset.id : 'bitcoin',
    'idr',
    range,
    asset.kind === 'crypto',
  );
  const q = asset.kind === 'fx' ? fxQ : cryptoQ;
  const env = q.data;
  const points: HistoryPoint[] = env?.data.points ?? [];

  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const change = first !== undefined && last !== undefined ? pctChange(last, first) : null;
  const unit = 'IDR';
  const altText = `Grafik ${asset.label} dalam ${unit} selama ${range} hari: dari ${formatNumber(first)} menjadi ${formatNumber(last)}, perubahan ${change === null ? 'tidak tersedia' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}.`;

  const [accent, setAccent] = useState('#1d4ed8');
  useEffect(() => setAccent(cssVar('--chart-1')), []);

  const data = useMemo(
    () => ({
      labels: points.map((p) => p.date),
      datasets: [
        {
          label: `${asset.label} (${unit})`,
          data: points.map((p) => p.value),
          borderColor: accent,
          backgroundColor: accent,
          borderWidth: 2,
          pointRadius: points.length > 60 ? 0 : 2,
          tension: 0.15,
        },
      ],
    }),
    [points, accent, asset.label],
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => (items[0] ? formatDateId(String(items[0].label)) : ''),
            label: (item) => `${formatNumber(item.parsed.y)} ${unit}`,
            afterBody: () =>
              asset.kind === 'fx' ? ['Kurs referensi ECB, bukan harga real-time.'] : [],
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 6,
            callback: (_v, i) => (points[i] ? formatDateId(points[i].date) : ''),
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: false,
          ticks: { callback: (v) => `${formatNumber(Number(v))}` },
          title: { display: true, text: unit },
        },
      },
    }),
    [asset.kind, points],
  );

  const assetKey = asset.kind === 'fx' ? `fx:${asset.pair}` : `crypto:${asset.id}`;
  const fileName = asset.kind === 'fx' ? asset.pair.toLowerCase() : asset.id;

  return (
    <section className="card grow-chart" aria-labelledby="chart-title" data-testid="chart-card">
      <div className="card__body">
        <div className="chart-tools">
          <h2 id="chart-title" className="card__title">
            Grafik historis
          </h2>
          <div className="chart-controls">
            <label className="visually-hidden" htmlFor="chart-asset">
              Aset grafik
            </label>
            <select
              id="chart-asset"
              className="select"
              style={{ width: 'auto' }}
              value={assetKey}
              data-testid="chart-asset"
              onChange={(e) => {
                const v = e.target.value;
                const found = [...cryptoAssets, ...FX_ASSETS].find(
                  (a) => (a.kind === 'fx' ? `fx:${a.pair}` : `crypto:${a.id}`) === v,
                );
                if (found) setAsset(found);
              }}
            >
              <optgroup label="Kripto (IDR)">
                {cryptoAssets.map((a) => (
                  <option
                    key={`crypto:${(a as { id: string }).id}`}
                    value={`crypto:${(a as { id: string }).id}`}
                  >
                    {a.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kurs FX">
                {FX_ASSETS.map((a) => (
                  <option
                    key={`fx:${(a as { pair: string }).pair}`}
                    value={`fx:${(a as { pair: string }).pair}`}
                  >
                    {a.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <div role="group" aria-label="Rentang grafik" className="segmented">
              {HISTORY_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  disabled={q.isFetching && range === r}
                  data-testid={`range-${r}`}
                  onClick={() => setRange(r)}
                >
                  {r} hari
                </button>
              ))}
            </div>
          </div>
        </div>

        {q.isError && !env ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : !env ? (
          <div className="chart-box" data-testid="chart-loading">
            <SkeletonBlock height={200} />
          </div>
        ) : (
          <div
            className="chart-box"
            role="img"
            aria-label={altText}
            data-testid="chart"
            data-range={range}
            data-points={points.length}
          >
            <Line data={data} options={options} />
          </div>
        )}
        <p className="visually-hidden" data-testid="chart-alt">
          {altText}
        </p>

        <div className="chart-tools">
          <span className="small muted">
            Sumbu Y dalam {unit}.{' '}
            {asset.kind === 'fx'
              ? 'Data ECB via Frankfurter, diperbarui tiap 1 jam.'
              : 'Data CoinGecko, diperbarui tiap 1 jam.'}{' '}
            {env && <DataBadge env={env} testId="chart-badge" normalText={envelopeLabel(env)} />}
          </span>
          <div className="inline">
            <button
              type="button"
              className="btn"
              aria-expanded={showTable}
              onClick={() => setShowTable((s) => !s)}
              data-testid="btn-view-data"
            >
              {showTable ? 'Sembunyikan data' : 'Lihat data'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={points.length === 0}
              onClick={() => downloadHistoryCsv(points, range, fileName)}
              data-testid="btn-download-csv"
            >
              Unduh CSV
            </button>
          </div>
        </div>

        {showTable && (
          <div className="history-table">
            <table data-testid="history-table">
              <caption className="visually-hidden">
                Data grafik {asset.label}, rentang {range} hari
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col" className="right">
                    Nilai ({unit})
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date}>
                    <td>{formatDateId(p.date)}</td>
                    <td className="right num">{formatNumber(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
