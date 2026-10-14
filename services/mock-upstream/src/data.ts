/**
 * Data deterministik untuk e2e. Angka mengikuti mockup UI (USD/IDR 16.250, BTC Rp1,41 M)
 * sehingga asersi di tes mudah dibaca.
 */

/** Rate EUR -> kode (format Frankfurter base=EUR). IDR/USD = 18850/1.16 = 16250. */
export const EUR_RATES: Record<string, number> = {
  USD: 1.16,
  IDR: 18850,
  SGD: 1.5,
  JPY: 175,
  GBP: 0.87,
  AUD: 1.76,
  CNY: 8.3,
  CHF: 0.93,
  MYR: 4.9,
  KRW: 1600,
};

/** Rate hari kerja sebelumnya: dibuat sedikit berbeda agar perubahan harian tidak nol. */
export const EUR_RATES_PREV: Record<string, number> = {
  ...EUR_RATES,
  IDR: 18771, // USD/IDR kemarin = 18771/1.16 = 16181.9 -> hari ini naik +0,42%
  SGD: 1.49, // SGD/IDR kemarin = 18771/1.49 = 12598 > hari ini 12567 -> turun
};

export const CURRENCIES: Record<string, string> = {
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Renminbi Yuan',
  EUR: 'Euro',
  GBP: 'British Pound',
  IDR: 'Indonesian Rupiah',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  MYR: 'Malaysian Ringgit',
  SGD: 'Singapore Dollar',
  USD: 'United States Dollar',
};

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  usd: number;
  /** Harga IDR eksplisit (angka mockup); jika kosong dihitung usd * USD_IDR. */
  idr?: number;
  change24h: number;
}

/** USD/IDR 16.250 dipakai untuk harga IDR: BTC 86.769 USD ≈ Rp1,41 M. */
export const USD_IDR = 16250;

export const COINS: Coin[] = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    usd: 86769.23,
    idr: 1_410_000_000,
    change24h: 1.2,
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    usd: 3249.23,
    idr: 52_800_000,
    change24h: -0.64,
  },
  { id: 'tether', symbol: 'usdt', name: 'Tether', usd: 1.0, change24h: 0.01 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', usd: 572.31, idr: 9_300_000, change24h: 0.31 },
  { id: 'solana', symbol: 'sol', name: 'Solana', usd: 182.4, change24h: 2.1 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', usd: 2.31, change24h: -1.5 },
  { id: 'usd-coin', symbol: 'usdc', name: 'USDC', usd: 1.0, change24h: 0 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', usd: 0.19, change24h: 3.2 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', usd: 0.72, change24h: -0.2 },
  { id: 'tron', symbol: 'trx', name: 'TRON', usd: 0.3, change24h: 0.5 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', usd: 28.1, change24h: -2.2 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', usd: 17.8, change24h: 1.1 },
  { id: 'the-open-network', symbol: 'ton', name: 'Toncoin', usd: 5.2, change24h: 0.8 },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', usd: 0.0000132, change24h: 4.0 },
  { id: 'sui', symbol: 'sui', name: 'Sui', usd: 2.9, change24h: -3.1 },
  { id: 'stellar', symbol: 'xlm', name: 'Stellar', usd: 0.31, change24h: 0.9 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', usd: 4.1, change24h: -0.7 },
  { id: 'bitcoin-cash', symbol: 'bch', name: 'Bitcoin Cash', usd: 410.2, change24h: 1.9 },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', usd: 92.3, change24h: 0.4 },
  { id: 'hedera-hashgraph', symbol: 'hbar', name: 'Hedera', usd: 0.17, change24h: -1.1 },
];

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Hari kerja (Senin-Jumat) dalam rentang, UTC. */
export function businessDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  while (d <= e) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(isoDate(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Hari kerja terakhir <= tanggal (ECB tidak menerbitkan di akhir pekan). */
export function lastBusinessDay(from: Date): string {
  const d = new Date(from);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return isoDate(d);
}

/** Variasi deterministik kecil (±1%) berdasarkan tanggal agar grafik tidak datar. */
export function wobble(date: string, seed: number): number {
  const n = Number(date.replace(/-/g, '')) + seed;
  return 1 + Math.sin(n / 3) * 0.01;
}
