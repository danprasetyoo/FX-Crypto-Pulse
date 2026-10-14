import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_FX_QUOTES, formatNumber } from '@fxpulse/shared';
import { useConvert, useCryptoTop, useFxCurrencies } from '../lib/queries';
import { ApiClientError } from '../lib/api';
import { DataBadge } from './DataBadge';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Konverter (F5): nominal, aset asal, aset tujuan; hasil memakai data cache terbaru dengan waktu data. */
export function Converter() {
  const [amountText, setAmountText] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('IDR');
  const amount = Number(amountText.replace(',', '.'));
  const amountValid = amountText.trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const debouncedAmount = useDebounced(amountValid ? amount : NaN, 300);

  const currencies = useFxCurrencies();
  const top = useCryptoTop();
  const q = useConvert(from, to, debouncedAmount);

  const fiatOptions = useMemo(() => {
    const map =
      currencies.data?.data.currencies ??
      Object.fromEntries(['IDR', ...DEFAULT_FX_QUOTES].map((c) => [c, c]));
    return Object.entries(map).sort(([a], [b]) =>
      a === 'IDR' ? -1 : b === 'IDR' ? 1 : a.localeCompare(b),
    );
  }, [currencies.data]);
  const cryptoOptions = top.data?.data.assets ?? [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
  ];

  const err =
    q.error instanceof ApiClientError
      ? q.error.message
      : q.isError
        ? 'Konversi gagal. Coba lagi.'
        : null;

  const AssetSelect = ({
    id,
    value,
    onChange,
    label,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    label: string;
  }) => (
    <div className="field" style={{ flex: 1 }}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
      >
        <optgroup label="Mata uang">
          {fiatOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {code} — {name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Kripto (top-20)">
          {cryptoOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.symbol.toUpperCase()})
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );

  return (
    <section className="card" aria-labelledby="conv-title" data-testid="converter">
      <div className="card__body">
        <h2 id="conv-title" className="card__title">
          Konverter
        </h2>
        <div className="field">
          <label htmlFor="conv-amount">Nominal</label>
          <input
            id="conv-amount"
            className="input num"
            inputMode="decimal"
            value={amountText}
            aria-invalid={!amountValid}
            onChange={(e) => setAmountText(e.target.value)}
            data-testid="convert-amount"
          />
          {!amountValid && <span className="error">Nominal harus angka positif.</span>}
        </div>
        <div className="inline" style={{ alignItems: 'flex-end' }}>
          <AssetSelect id="convert-from" label="Dari" value={from} onChange={setFrom} />
          <button
            type="button"
            className="btn"
            aria-label="Tukar asal dan tujuan"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            ⇄
          </button>
          <AssetSelect id="convert-to" label="Ke" value={to} onChange={setTo} />
        </div>

        <div aria-live="polite">
          {err ? (
            <p className="error" role="alert" data-testid="convert-error">
              {err}
            </p>
          ) : q.data ? (
            <div className="stack">
              <div className="mcard__value num" data-testid="convert-result">
                {formatNumber(q.data.data.result)}{' '}
                {q.data.data.to.length === 3 ? q.data.data.to : ''}
              </div>
              <div className="small muted">
                1 {q.data.data.from} ={' '}
                <span className="num" data-testid="convert-rate">
                  {formatNumber(q.data.data.rate)}
                </span>{' '}
                {q.data.data.to}
              </div>
              <DataBadge env={q.data} testId="convert-badge" />
            </div>
          ) : amountValid ? (
            <span className="skeleton" style={{ height: 28, width: '50%' }} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
