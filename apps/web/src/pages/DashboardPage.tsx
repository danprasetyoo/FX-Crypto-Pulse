import { formatTimeWib } from '@fxpulse/shared';
import { CryptoTable } from '../components/CryptoTable';
import { FxCard } from '../components/FxCard';
import { HistoryChart } from '../components/HistoryChart';
import { fxDateLabel } from '../lib/labels';
import { useCryptoTop, useFxLatest } from '../lib/queries';

/** Layout dashboard (Design System bagian 5): FX kiri, kripto kanan, grafik baris penuh. */
export function DashboardPage() {
  const fx = useFxLatest();
  const top = useCryptoTop();

  const parts: string[] = [];
  if (fx.data) parts.push(fxDateLabel(fx.data.data.date));
  if (top.data) parts.push(`Harga kripto diperbarui ${formatTimeWib(top.data.updatedAt)}`);

  return (
    <>
      <p className="status-line" data-testid="status-line">
        {parts.length ? parts.join(' · ') : 'Memuat data terbaru…'}
      </p>
      <div className="row">
        <FxCard />
        <CryptoTable />
      </div>
      <div className="row">
        <HistoryChart />
      </div>
    </>
  );
}
