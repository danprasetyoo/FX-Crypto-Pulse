import express, { type Request, type Response, type NextFunction } from 'express';
import {
  COINS,
  CURRENCIES,
  EUR_RATES,
  EUR_RATES_PREV,
  USD_IDR,
  businessDays,
  isoDate,
  lastBusinessDay,
  wobble,
} from './data';

type Mode = 'ok' | 'down' | 'rate-limit' | 'timeout';

/** State yang bisa diubah tes lewat /__control. */
const state = {
  mode: 'ok' as Mode,
  priceOverrides: new Map<string, { usd?: number; idr?: number }>(),
  counts: {} as Record<string, number>,
  /** Penundaan buatan untuk mode timeout (ms). */
  timeoutDelayMs: 30_000,
};

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (!req.path.startsWith('/__control')) {
    const key = `${req.method} ${req.path}`;
    state.counts[key] = (state.counts[key] ?? 0) + 1;
    state.counts.total = (state.counts.total ?? 0) + 1;
  }
  next();
});

/** Simulasi kegagalan upstream sesuai mode. */
function failureGate(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/__control')) return next();
  switch (state.mode) {
    case 'down':
      res.status(503).json({ error: 'service unavailable (mock)' });
      return;
    case 'rate-limit':
      res
        .status(429)
        .set('retry-after', '60')
        .json({ status: { error_code: 429, error_message: 'rate limited (mock)' } });
      return;
    case 'timeout':
      setTimeout(() => res.status(504).end(), state.timeoutDelayMs);
      return;
    default:
      next();
  }
}
app.use(failureGate);

// ---------------- Frankfurter ----------------

app.get('/v1/currencies', (_req, res) => {
  res.json(CURRENCIES);
});

app.get('/v1/latest', (req, res) => {
  const date = lastBusinessDay(new Date());
  res.json({ amount: 1, base: 'EUR', date, rates: pickRates(EUR_RATES, req.query.symbols) });
});

/** /v1/2026-09-10..2026-10-10 atau /v1/2026-09-10.. */
app.get(/^\/v1\/(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})?$/, (req, res) => {
  const start = req.params[0] as string;
  const end = (req.params[1] as string | undefined) ?? lastBusinessDay(new Date());
  const days = businessDays(start, end);
  const last = days[days.length - 1];
  const prev = days[days.length - 2];
  const rates: Record<string, Record<string, number>> = {};
  for (const d of days) {
    const base = d === last ? EUR_RATES : d === prev ? EUR_RATES_PREV : EUR_RATES;
    const factor = d === last || d === prev ? 1 : wobble(d, 7);
    const picked = pickRates(base, req.query.symbols);
    rates[d] = Object.fromEntries(
      Object.entries(picked).map(([k, v]) => [k, k === 'USD' ? v : v * factor]),
    );
  }
  res.json({ amount: 1, base: 'EUR', start_date: days[0] ?? start, end_date: last ?? end, rates });
});

function pickRates(source: Record<string, number>, symbols: unknown): Record<string, number> {
  if (typeof symbols !== 'string' || !symbols) return { ...source };
  const out: Record<string, number> = {};
  for (const s of symbols.split(',')) if (s in source) out[s] = source[s];
  return out;
}

// ---------------- CoinGecko ----------------

function priceOf(coinId: string, vs: string): number {
  const coin = COINS.find((c) => c.id === coinId)!;
  const o = state.priceOverrides.get(coinId);
  if (vs === 'usd') return o?.usd ?? coin.usd;
  if (vs === 'idr')
    return o?.idr ?? (o?.usd !== undefined ? o.usd * USD_IDR : (coin.idr ?? coin.usd * USD_IDR));
  return coin.usd;
}

app.get('/api/v3/coins/markets', (req, res) => {
  const vs = String(req.query.vs_currency ?? 'usd').toLowerCase();
  const perPage = Math.min(Number(req.query.per_page ?? 20) || 20, COINS.length);
  res.json(
    COINS.slice(0, perPage).map((c, i) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: `https://mock.local/coins/${c.id}.png`,
      market_cap_rank: i + 1,
      current_price: priceOf(c.id, vs),
      price_change_percentage_24h: c.change24h,
    })),
  );
});

app.get('/api/v3/coins/:id/market_chart', (req, res) => {
  const coin = COINS.find((c) => c.id === req.params.id);
  if (!coin) return res.status(404).json({ error: 'coin not found' });
  const vs = String(req.query.vs_currency ?? 'usd').toLowerCase();
  const days = Math.max(1, Math.min(Number(req.query.days ?? 30) || 30, 365));
  const now = Date.now();
  const latest = priceOf(coin.id, vs);
  const prices: [number, number][] = [];
  for (let i = days; i >= 0; i--) {
    const ts = now - i * 86_400_000;
    const date = isoDate(new Date(ts));
    prices.push([ts, i === 0 ? latest : latest * wobble(date, 3)]);
  }
  res.json({ prices });
});

// ---------------- Kontrol untuk e2e ----------------

app.post('/__control/mode', (req, res) => {
  const mode = req.body?.mode as Mode;
  if (!['ok', 'down', 'rate-limit', 'timeout'].includes(mode))
    return res.status(400).json({ error: 'mode tidak valid' });
  state.mode = mode;
  if (typeof req.body?.timeoutDelayMs === 'number') state.timeoutDelayMs = req.body.timeoutDelayMs;
  res.json({ mode: state.mode });
});

app.post('/__control/price', (req, res) => {
  const { id, usd, idr } = req.body ?? {};
  if (!COINS.some((c) => c.id === id)) return res.status(400).json({ error: 'id tidak dikenal' });
  state.priceOverrides.set(id, { usd, idr });
  res.json({ id, usd: priceOf(id, 'usd'), idr: priceOf(id, 'idr') });
});

app.post('/__control/reset', (_req, res) => {
  state.mode = 'ok';
  state.priceOverrides.clear();
  state.counts = {};
  res.json({ ok: true });
});

app.get('/__control/stats', (_req, res) => {
  res.json({
    mode: state.mode,
    counts: state.counts,
    overrides: Object.fromEntries(state.priceOverrides),
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mock-upstream' }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, '0.0.0.0', () => console.info(`[mock-upstream] listening on :${port}`));
