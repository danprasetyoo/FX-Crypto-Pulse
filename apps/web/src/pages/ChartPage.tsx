import { HistoryChart } from '../components/HistoryChart';

/** Tab "Grafik" di mobile: grafik saja, layar penuh. */
export function ChartPage() {
  return (
    <div className="row">
      <HistoryChart />
    </div>
  );
}
