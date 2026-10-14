import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_FX_QUOTES, type AlertCondition, type AssetType } from '@fxpulse/shared';
import { useCreateAlert, useCryptoTop } from '../lib/queries';
import { ApiClientError } from '../lib/api';
import { fxPairLabel } from '../lib/labels';
import { useToast } from './Toast';

/** Form alert (F4) mengikuti mockup "Buat alert harga". */
export function AlertForm() {
  const top = useCryptoTop();
  const create = useCreateAlert();
  const toast = useToast();
  const navigate = useNavigate();

  const [assetKey, setAssetKey] = useState('crypto:bitcoin');
  const [condition, setCondition] = useState<AlertCondition>('below');
  const [targetText, setTargetText] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [error, setError] = useState<string | null>(null);

  const [type, assetCode] = assetKey.split(':') as [AssetType, string];
  const cryptoOptions = top.data?.data.assets ?? [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
  ];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = Number(targetText.replace(/\./g, '').replace(',', '.'));
    if (!targetText.trim() || !Number.isFinite(target) || target <= 0) {
      setError('Harga target harus angka lebih dari 0.');
      return;
    }
    setError(null);
    create.mutate(
      { type, assetCode, condition, target, currency: type === 'fx' ? 'IDR' : currency },
      {
        onSuccess: () => {
          toast.success('Alert tersimpan.');
          navigate('/alerts');
        },
        onError: (err) =>
          setError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan alert.'),
      },
    );
  };

  return (
    <form className="card form-narrow" onSubmit={onSubmit} data-testid="alert-form" noValidate>
      <div className="card__body">
        <h1 className="page-title">Buat alert harga</h1>

        <div className="field">
          <label htmlFor="alert-asset">Aset</label>
          <select
            id="alert-asset"
            className="select"
            value={assetKey}
            onChange={(e) => setAssetKey(e.target.value)}
            data-testid="alert-asset"
          >
            <optgroup label="Kripto">
              {cryptoOptions.map((a) => (
                <option key={a.id} value={`crypto:${a.id}`}>
                  {a.name} ({a.symbol.toUpperCase()})
                </option>
              ))}
            </optgroup>
            <optgroup label="Kurs FX (dalam IDR)">
              {DEFAULT_FX_QUOTES.map((q) => (
                <option key={q} value={`fx:${q}`}>
                  {fxPairLabel(q)}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <fieldset className="field">
          <legend>Kondisi</legend>
          <div className="radio-group" data-testid="alert-condition">
            <label>
              <input
                type="radio"
                name="condition"
                value="above"
                checked={condition === 'above'}
                onChange={() => setCondition('above')}
              />
              Di atas
            </label>
            <label>
              <input
                type="radio"
                name="condition"
                value="below"
                checked={condition === 'below'}
                onChange={() => setCondition('below')}
              />
              Di bawah
            </label>
          </div>
        </fieldset>

        {type === 'crypto' && (
          <div className="field">
            <label htmlFor="alert-currency">Mata uang target</label>
            <select
              id="alert-currency"
              className="select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              data-testid="alert-currency"
            >
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="alert-target">Harga target ({type === 'fx' ? 'IDR' : currency})</label>
          <input
            id="alert-target"
            className="input num"
            inputMode="decimal"
            placeholder={
              type === 'crypto' && currency === 'IDR' ? 'Contoh: 900000000' : 'Contoh: 16000'
            }
            value={targetText}
            aria-invalid={Boolean(error)}
            aria-describedby="alert-target-hint"
            onChange={(e) => setTargetText(e.target.value)}
            data-testid="alert-target"
          />
          <span id="alert-target-hint" className="hint">
            Notifikasi email dikirim sekali saat kondisi terpenuhi, lalu alert nonaktif.
          </span>
          <span className="hint">Pengecekan tiap 5 menit. Keterlambatan maksimal 10 menit.</span>
          {error && (
            <span className="error" role="alert" data-testid="alert-error">
              {error}
            </span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={create.isPending}
            data-testid="alert-submit"
          >
            Simpan alert
          </button>
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Batal
          </button>
        </div>
      </div>
    </form>
  );
}
