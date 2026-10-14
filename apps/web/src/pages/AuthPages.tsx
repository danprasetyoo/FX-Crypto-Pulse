import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { api, ApiClientError } from '../lib/api';
import { keys, useLogout, useMe } from '../lib/queries';

function useAuthForm(mode: 'login' | 'register') {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === 'login' ? await api.login(email, password) : await api.register(email, password);
      qc.setQueryData(keys.me, res.user);
      toast.success(mode === 'login' ? 'Berhasil masuk.' : 'Akun dibuat. Anda sudah masuk.');
      navigate(params.get('next') || '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return { email, setEmail, password, setPassword, error, busy, submit, next: params.get('next') };
}

function AuthFormFields(
  p: ReturnType<typeof useAuthForm> & { submitText: string; autoCompletePassword: string },
) {
  return (
    <>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={p.email}
          onChange={(e) => p.setEmail(e.target.value)}
          data-testid="auth-email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={p.autoCompletePassword}
          required
          minLength={8}
          value={p.password}
          onChange={(e) => p.setPassword(e.target.value)}
          data-testid="auth-password"
        />
        <span className="hint">Minimal 8 karakter.</span>
      </div>
      {p.error && (
        <p className="error" role="alert" data-testid="auth-error">
          {p.error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={p.busy}
        data-testid="auth-submit"
      >
        {p.submitText}
      </button>
    </>
  );
}

export function LoginPage() {
  const f = useAuthForm('login');
  const suffix = f.next ? `?next=${encodeURIComponent(f.next)}` : '';
  return (
    <form className="card form-narrow" onSubmit={f.submit} data-testid="login-form">
      <div className="card__body">
        <h1 className="page-title">Masuk</h1>
        <AuthFormFields {...f} submitText="Masuk" autoCompletePassword="current-password" />
        <p className="small muted">
          Belum punya akun? <Link to={`/register${suffix}`}>Daftar</Link> ·{' '}
          <Link to="/reset-request">Lupa password?</Link>
        </p>
      </div>
    </form>
  );
}

export function RegisterPage() {
  const f = useAuthForm('register');
  const suffix = f.next ? `?next=${encodeURIComponent(f.next)}` : '';
  return (
    <form className="card form-narrow" onSubmit={f.submit} data-testid="register-form">
      <div className="card__body">
        <h1 className="page-title">Daftar</h1>
        <AuthFormFields {...f} submitText="Buat akun" autoCompletePassword="new-password" />
        <p className="small muted">
          Sudah punya akun? <Link to={`/login${suffix}`}>Masuk</Link>
        </p>
      </div>
    </form>
  );
}

export function ResetRequestPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.resetRequest(email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-narrow" onSubmit={submit} data-testid="reset-request-form">
      <div className="card__body">
        <h1 className="page-title">Reset password</h1>
        {sent ? (
          <p data-testid="reset-sent">
            Jika email terdaftar, tautan reset telah dikirim. Periksa kotak masuk Anda dalam 1 jam.
          </p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="auth-email"
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={busy}
              data-testid="auth-submit"
            >
              Kirim tautan reset
            </button>
          </>
        )}
        <p className="small muted">
          <Link to="/login">Kembali ke halaman masuk</Link>
        </p>
      </div>
    </form>
  );
}

export function ResetConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setBusy(true);
    try {
      await api.resetConfirm(token, password);
      toast.success('Password diganti. Silakan masuk.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-narrow" onSubmit={submit} data-testid="reset-confirm-form">
      <div className="card__body">
        <h1 className="page-title">Password baru</h1>
        {!token && <p className="error">Tautan tidak lengkap. Minta tautan reset yang baru.</p>}
        <div className="field">
          <label htmlFor="password">Password baru</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="auth-password"
          />
        </div>
        {error && (
          <p className="error" role="alert" data-testid="auth-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={busy || !token}
          data-testid="auth-submit"
        >
          Simpan password
        </button>
      </div>
    </form>
  );
}

/** Tab "Akun" di mobile. */
export function AccountPage() {
  const me = useMe();
  const logout = useLogout();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <div className="card form-narrow" data-testid="account-page">
      <div className="card__body">
        <h1 className="page-title">Akun</h1>
        {me.data ? (
          <>
            <p>
              Masuk sebagai <strong data-testid="account-email">{me.data.email}</strong>
            </p>
            <div className="stack">
              <Link to="/watchlist" className="btn">
                Watchlist
              </Link>
              <Link to="/alerts" className="btn">
                Alert
              </Link>
              <button
                type="button"
                className="btn"
                data-testid="btn-logout"
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => {
                      toast.success('Anda telah keluar.');
                      navigate('/');
                    },
                  })
                }
              >
                Keluar
              </button>
            </div>
          </>
        ) : (
          <div className="stack">
            <p className="muted">Masuk untuk menyimpan watchlist dan alert.</p>
            <Link to="/login" className="btn btn--primary">
              Masuk
            </Link>
            <Link to="/register" className="btn">
              Daftar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
