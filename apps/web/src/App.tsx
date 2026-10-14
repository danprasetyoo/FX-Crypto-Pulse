import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChartPage } from './pages/ChartPage';
import { ConverterPage } from './pages/ConverterPage';
import { DashboardPage } from './pages/DashboardPage';

function NotFound() {
  return (
    <div className="card form-narrow">
      <div className="card__body">
        <h1 className="page-title">Halaman tidak ditemukan</h1>
        <Link to="/">Kembali ke dashboard</Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="chart" element={<ChartPage />} />
        <Route path="convert" element={<ConverterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
