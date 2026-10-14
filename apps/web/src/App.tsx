import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AlertsPage } from './pages/AlertsPage';
import {
  AccountPage,
  LoginPage,
  RegisterPage,
  ResetConfirmPage,
  ResetRequestPage,
} from './pages/AuthPages';
import { ChartPage } from './pages/ChartPage';
import { ConverterPage } from './pages/ConverterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAlertPage } from './pages/NewAlertPage';
import { WatchlistPage } from './pages/WatchlistPage';

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
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="alerts/new" element={<NewAlertPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="reset-request" element={<ResetRequestPage />} />
        <Route path="reset" element={<ResetConfirmPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
