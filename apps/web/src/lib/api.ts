import type {
  ApiEnvelope,
  ApiError,
  ConvertData,
  CryptoHistoryData,
  CryptoTopData,
  FxCurrenciesData,
  FxHistoryData,
  FxLatestData,
  HistoryRange,
} from '@fxpulse/shared';

/** Satu-satunya tempat frontend berbicara dengan backend. Semua lewat /api (gateway). */

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const BASE = '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
      ...init,
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body ?? {}) as Partial<ApiError>;
    throw new ApiClientError(
      res.status,
      err.code ?? 'HTTP_ERROR',
      err.message ?? 'Terjadi kesalahan. Coba lagi beberapa saat.',
      err.details,
    );
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

// ---- Market ----
export const api = {
  fxLatest: (base: string, quotes: string[]) =>
    request<ApiEnvelope<FxLatestData>>(`/fx/latest${qs({ base, quotes: quotes.join(',') })}`),
  fxHistory: (pair: string, range: HistoryRange) =>
    request<ApiEnvelope<FxHistoryData>>(`/fx/history${qs({ pair, range })}`),
  fxCurrencies: () => request<ApiEnvelope<FxCurrenciesData>>('/fx/currencies'),
  cryptoTop: (vs: string[] = ['idr', 'usd']) =>
    request<ApiEnvelope<CryptoTopData>>(`/crypto/top${qs({ vs: vs.join(',') })}`),
  cryptoHistory: (id: string, vs: string, range: HistoryRange) =>
    request<ApiEnvelope<CryptoHistoryData>>(`/crypto/history${qs({ id, vs, range })}`),
  convert: (from: string, to: string, amount: number) =>
    request<ApiEnvelope<ConvertData>>(`/convert${qs({ from, to, amount })}`),
};
