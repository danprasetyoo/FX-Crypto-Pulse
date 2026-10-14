import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_TOP_LIMIT } from '@fxpulse/shared';
import { CONFIG, type MarketConfig } from '../config';
import { HttpClient } from '../upstream/http-client';

/** Subset field /coins/markets yang dipakai. */
export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  market_cap_rank: number | null;
  current_price: number;
  price_change_percentage_24h: number | null;
}

export interface MarketChart {
  /** [timestampMs, price] */
  prices: [number, number][];
}

/**
 * Klien tipis ke CoinGecko free tier. API key opsional (demo) dikirim lewat header
 * x-cg-demo-api-key (PRD risiko: kebijakan free tier berubah).
 */
@Injectable()
export class CoinGeckoClient {
  constructor(
    private readonly http: HttpClient,
    @Inject(CONFIG) private readonly config: MarketConfig,
  ) {}

  private headers(): Record<string, string> {
    return this.config.coingeckoApiKey ? { 'x-cg-demo-api-key': this.config.coingeckoApiKey } : {};
  }

  /** Satu request untuk seluruh top-N dalam satu mata uang kuotasi (FSD bagian 7). */
  topMarkets(vs: string, limit = CRYPTO_TOP_LIMIT): Promise<CoinMarket[]> {
    const url = new URL(`${this.config.coingeckoBaseUrl}/coins/markets`);
    url.searchParams.set('vs_currency', vs);
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', String(limit));
    url.searchParams.set('page', '1');
    url.searchParams.set('sparkline', 'false');
    url.searchParams.set('price_change_percentage', '24h');
    return this.http.getJson<CoinMarket[]>(url.toString(), { headers: this.headers() });
  }

  marketChart(id: string, vs: string, days: number): Promise<MarketChart> {
    const url = new URL(
      `${this.config.coingeckoBaseUrl}/coins/${encodeURIComponent(id)}/market_chart`,
    );
    url.searchParams.set('vs_currency', vs);
    url.searchParams.set('days', String(days));
    return this.http.getJson<MarketChart>(url.toString(), { headers: this.headers() });
  }
}
