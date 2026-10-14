/**
 * Konfigurasi dibaca sekali dari environment. Semua nilai punya default
 * yang cocok untuk docker compose lokal; produksi wajib menimpanya lewat env.
 */
export interface MarketConfig {
  port: number;
  redisUrl: string;
  frankfurterBaseUrl: string;
  coingeckoBaseUrl: string;
  coingeckoApiKey: string | undefined;
  upstreamTimeoutMs: number;
  upstreamMaxRetries: number;
  ttl: {
    cryptoTopSec: number;
    cryptoHistorySec: number;
    fxSec: number;
    fxCurrenciesSec: number;
  };
  adminEnabled: boolean;
  logLevel: string;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} harus angka, dapat "${raw}"`);
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MarketConfig {
  const prev = process.env;
  process.env = env;
  try {
    return {
      port: num('PORT', 3001),
      redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
      frankfurterBaseUrl: (env.FRANKFURTER_BASE_URL ?? 'https://api.frankfurter.dev/v1').replace(
        /\/$/,
        '',
      ),
      coingeckoBaseUrl: (env.COINGECKO_BASE_URL ?? 'https://api.coingecko.com/api/v3').replace(
        /\/$/,
        '',
      ),
      coingeckoApiKey: env.COINGECKO_API_KEY || undefined,
      upstreamTimeoutMs: num('UPSTREAM_TIMEOUT_MS', 5000),
      upstreamMaxRetries: num('UPSTREAM_MAX_RETRIES', 2),
      ttl: {
        cryptoTopSec: num('CACHE_TTL_CRYPTO_TOP_SEC', 60),
        cryptoHistorySec: num('CACHE_TTL_CRYPTO_HISTORY_SEC', 3600),
        fxSec: num('CACHE_TTL_FX_SEC', 3600),
        fxCurrenciesSec: num('CACHE_TTL_FX_CURRENCIES_SEC', 86400),
      },
      adminEnabled: bool('MARKET_ADMIN_ENABLED', false),
      logLevel: env.LOG_LEVEL ?? 'info',
    };
  } finally {
    process.env = prev;
  }
}

export const CONFIG = Symbol('MARKET_CONFIG');
