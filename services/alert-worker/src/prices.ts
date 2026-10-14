import type { ApiEnvelope, CryptoTopData, FxLatestData } from '@fxpulse/shared';
import type { ActiveAlert } from './alerts.repo';

/** Peta harga terkini: key "type:assetCode:CURRENCY" -> harga. */
export interface PriceBook {
  prices: Map<string, number>;
  stale: boolean;
  updatedAt: string;
}

export const priceKey = (type: string, assetCode: string, currency: string): string =>
  `${type}:${assetCode}:${currency.toUpperCase()}`;

export interface PriceSource {
  /** Mengambil harga untuk semua aset yang dibutuhkan alert; memakai cache market-service. */
  fetch(alerts: ActiveAlert[]): Promise<PriceBook>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`market-service ${res.status} untuk ${url}`);
  return (await res.json()) as T;
}

/**
 * Harga diambil dari market-service (bukan langsung ke API eksternal) sehingga
 * worker ikut memakai cache yang sama (FSD bagian 7: "Dipakai juga oleh worker").
 */
export class MarketServicePriceSource implements PriceSource {
  constructor(private readonly baseUrl: string) {}

  async fetch(alerts: ActiveAlert[]): Promise<PriceBook> {
    const prices = new Map<string, number>();
    let stale = false;
    let updatedAt = new Date().toISOString();

    const fxCodes = Array.from(
      new Set(alerts.filter((a) => a.type === 'fx').map((a) => a.assetCode)),
    );
    if (fxCodes.length) {
      const fx = await getJson<ApiEnvelope<FxLatestData>>(
        `${this.baseUrl}/api/fx/latest?base=IDR&quotes=${encodeURIComponent(fxCodes.join(','))}`,
      );
      for (const r of fx.data.rates) prices.set(priceKey('fx', r.quote, 'IDR'), r.rate);
      stale = stale || fx.stale;
      if (fx.updatedAt < updatedAt) updatedAt = fx.updatedAt;
    }

    if (alerts.some((a) => a.type === 'crypto')) {
      const top = await getJson<ApiEnvelope<CryptoTopData>>(
        `${this.baseUrl}/api/crypto/top?vs=idr,usd`,
      );
      for (const asset of top.data.assets) {
        for (const [cur, price] of Object.entries(asset.price)) {
          prices.set(priceKey('crypto', asset.id, cur), price);
        }
      }
      stale = stale || top.stale;
      if (top.updatedAt < updatedAt) updatedAt = top.updatedAt;
    }

    return { prices, stale, updatedAt };
  }
}
