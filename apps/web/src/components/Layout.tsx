import { NavLink, Link, Outlet } from 'react-router-dom';
import { DISCLAIMER_TEXT } from '@fxpulse/shared';

// Navigasi akun (Masuk, Watchlist, Alert) ditambahkan bersama fitur auth.
const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/convert', label: 'Konverter' },
];

const tabItems = [
  { to: '/', label: 'Beranda', icon: '⌂', end: true },
  { to: '/chart', label: 'Grafik', icon: '↗' },
  { to: '/convert', label: 'Konverter', icon: '⇄' },
];

export function Layout() {
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
