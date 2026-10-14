import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { DISCLAIMER_TEXT } from '@fxpulse/shared';
import { useLogout, useMe } from '../lib/queries';
import { useToast } from './Toast';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/convert', label: 'Konverter' },
  { to: '/alerts', label: 'Alert' },
];

const tabItems = [
  { to: '/', label: 'Beranda', icon: '⌂', end: true },
  { to: '/chart', label: 'Grafik', icon: '↗' },
  { to: '/convert', label: 'Konverter', icon: '⇄' },
  { to: '/account', label: 'Akun', icon: '◯' },
];

export function Layout() {
  const me = useMe();
  const logout = useLogout();
  const toast = useToast();
  const navigate = useNavigate();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('Anda telah keluar.');
        navigate('/');
      },
    });
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header__brand">
            <Link to="/" className="header__logo">
              FX &amp; Crypto Pulse
            </Link>
            <nav className="nav" aria-label="Utama">
              {navItems.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="header__actions">
            {me.data ? (
              <>
                <span className="small muted desktop-only" data-testid="header-email">
                  {me.data.email}
                </span>
                <button
                  type="button"
                  className="btn desktop-only"
                  onClick={onLogout}
                  data-testid="btn-logout"
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/login" className="btn" data-testid="btn-login">
                Masuk
              </Link>
            )}
            <Link to="/alerts/new" className="btn btn--primary" data-testid="btn-new-alert">
              Buat alert
            </Link>
          </div>
        </header>

        <Outlet />

        <footer className="footer">
          <span data-testid="disclaimer">{DISCLAIMER_TEXT}</span>
          <span>FX &amp; Crypto Pulse v1.0.0</span>
        </footer>
      </div>

      <nav className="tabbar" aria-label="Navigasi bawah">
        {tabItems.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
