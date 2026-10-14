/**
 * Kontrak API internal (FSD bagian 6).
 * Setiap respons data dibungkus ApiEnvelope agar frontend selalu tahu
 * kapan data diambil (updatedAt), dari mana (source), dan apakah sudah basi (stale).
 */

export type DataSource = 'live' | 'cache';

export interface ApiEnvelope<T> {
  data: T;
  /** ISO-8601 waktu data diambil dari upstream. */
  updatedAt: string;
  /** 'live' jika baru diambil dari upstream, 'cache' jika dari Redis. */
  source: DataSource;
  /** true jika data lebih tua dari batas TTL cache (upstream gagal/429). */
  stale: boolean;
}

export interface ApiError {
  statusCode: number;
  /** Kode mesin, stabil untuk dipakai frontend/e2e. */
  code: string;
  /** Pesan untuk pengguna. Tidak menyebut nama API eksternal atau kode teknis. */
  message: string;
  details?: unknown;
}

// ---------- FX ----------

export interface FxRate {
  /** Mata uang yang dinilai, misal USD. */
  quote: string;
  /** Mata uang basis, misal IDR. Nilai = berapa `base` untuk 1 `quote`. */
  base: string;
  /** Kurs: 1 quote = rate base. Contoh USD/IDR = 16250. */
  rate: number;
  /** Kurs hari kerja sebelumnya, null bila tidak tersedia. */
  previousRate: number | null;
  /** Perubahan harian dalam persen, null bila tidak tersedia. */
  changePct: number | null;
  /** Tanggal data ECB (YYYY-MM-DD). */
  date: string;
  /** Tanggal data hari kerja sebelumnya. */
  previousDate: string | null;
}

export interface FxLatestData {
  base: string;
  /** Tanggal referensi ECB untuk seluruh set kurs. */
  date: string;
  rates: FxRate[];
}

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

export interface FxHistoryData {
  /** Contoh "USD-IDR". Nilai = IDR per 1 USD. */
  pair: string;
  base: string;
  quote: string;
  range: HistoryRange;
  points: HistoryPoint[];
}

export interface FxCurrenciesData {
  /** Kode -> nama mata uang. */
  currencies: Record<string, string>;
}

// ---------- Crypto ----------

export interface CryptoAsset {
  /** ID CoinGecko, misal "bitcoin". */
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  marketCapRank: number | null;
  /** Harga per mata uang kuotasi (lowercase), misal { idr: 1410000000, usd: 86000 }. */
  price: Record<string, number>;
  /** Perubahan 24 jam (%) per mata uang kuotasi. */
  change24hPct: Record<string, number | null>;
}

export interface CryptoTopData {
  vs: string[];
  assets: CryptoAsset[];
}

export interface CryptoHistoryData {
  id: string;
  vs: string;
  range: HistoryRange;
  points: HistoryPoint[];
}

// ---------- Konverter ----------

export type AssetType = 'fx' | 'crypto';

export interface ConvertData {
  from: string;
  to: string;
  amount: number;
  result: number;
  /** 1 from = rate to */
  rate: number;
  fromType: AssetType;
  toType: AssetType;
}

// ---------- Auth ----------

export interface UserPublic {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserPublic;
}

// ---------- Watchlist ----------

export interface WatchlistItem {
  id: string;
  type: AssetType;
  /** Untuk fx: kode mata uang (USD). Untuk crypto: id CoinGecko (bitcoin). */
  assetCode: string;
  createdAt: string;
}

export interface CreateWatchlistItemInput {
  type: AssetType;
  assetCode: string;
}

// ---------- Alert ----------

export type AlertCondition = 'above' | 'below';
/** active = aktif, triggered = terpicu, inactive = nonaktif (FSD bagian 5). */
export type AlertStatus = 'active' | 'triggered' | 'inactive';

export interface Alert {
  id: string;
  type: AssetType;
  assetCode: string;
  condition: AlertCondition;
  target: number;
  /** Mata uang target: IDR atau USD. */
  currency: string;
  status: AlertStatus;
  triggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  type: AssetType;
  assetCode: string;
  condition: AlertCondition;
  target: number;
  currency: string;
}

export interface UpdateAlertInput {
  target?: number;
  condition?: AlertCondition;
  /** Hanya 'active' (aktifkan kembali) atau 'inactive' yang bisa diminta pengguna. */
  status?: 'active' | 'inactive';
}

export type HistoryRange = 30 | 90 | 365;
