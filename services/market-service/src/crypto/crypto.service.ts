import { Inject, Injectable } from '@nestjs/common';
import type {
  CryptoAsset,
  CryptoHistoryData,
  CryptoTopData,
  HistoryPoint,
  HistoryRange,
} from '@fxpulse/shared';
import { CacheService, type Resolved } from '../cache/cache.service';
import { CONFIG, type MarketConfig } from '../config';
import { CoinGeckoClient, type CoinMarket, type MarketChart } from './coingecko.client';

@Injectable()
export class CryptoService {
  constructor(
    private readonly cache: CacheService,
    private readonly coingecko: CoinGeckoClient,
    @Inject(CONFIG) private readonly config: MarketConfig,
  ) {}

  /** Top-20 per mata uang kuotasi; satu request CoinGecko per vs, cache 60 dtk (F2). */
  private topFor(vs: string): Promise<Resolved<CoinMarket[]>> {
    return this.cache.getOrFetch(`crypto:top:${vs}`, this.config.ttl.cryptoTopSec, () =>
      this.coingecko.topMarkets(vs),
    );
  }

  async top(vs: string[]): Promise<Resolved<CryptoTopData>> {
    const parts = await Promise.all(vs.map((v) => this.topFor(v)));
    const value = CryptoService.merge(
      vs,
      parts.map((p) => p.value),
    );
    return {
      value,
      updatedAt: parts.reduce(
        (min, p) => (p.updatedAt < min ? p.updatedAt : min),
        parts[0].updatedAt,
      ),
      source: parts.every((p) => p.source === 'live') ? 'live' : 'cache',
      stale: parts.some((p) => p.stale),
    };
  }

  /** Menggabungkan daftar per-vs menjadi satu daftar aset; urutan mengikuti vs pertama. */
  static merge(vs: string[], lists: CoinMarket[][]): CryptoTopData {
    const byId = new Map<string, CryptoAsset>();
    lists.forEach((list, i) => {
      const cur = vs[i];
      for (const m of list) {
        let a = byId.get(m.id);
        if (!a) {
          a = {
            id: m.id,
            symbol: m.symbol,
            name: m.name,
            image: m.image ?? null,
            marketCapRank: m.market_cap_rank ?? null,
            price: {},
            change24hPct: {},
          };
          byId.set(m.id, a);
        }
        a.price[cur] = m.current_price;
        a.change24hPct[cur] = m.price_change_percentage_24h ?? null;
      }
    });
    const assets = (lists[0] ?? []).map((m) => byId.get(m.id)!).filter(Boolean);
    return { vs, assets };
  }

  /** Riwayat harga harian; cache 1 jam per koin, vs, dan rentang (F3). */
  async history(id: string, vs: string, range: HistoryRange): Promise<Resolved<CryptoHistoryData>> {
    const chart = await this.cache.getOrFetch(
      `crypto:history:${id}:${vs}:${range}`,
      this.config.ttl.cryptoHistorySec,
      () => this.coingecko.marketChart(id, vs, range),
    );
    return { ...chart, value: { id, vs, range, points: CryptoService.toDaily(chart.value) } };
  }

  /**
   * CoinGecko mengembalikan titik per jam untuk rentang <= 90 hari.
   * Ambil titik terakhir per tanggal UTC agar grafik konsisten harian.
   */
  static toDaily(chart: MarketChart): HistoryPoint[] {
    const byDate = new Map<string, number>();
    for (const [ts, price] of chart.prices ?? []) {
      if (!Number.isFinite(ts) || !Number.isFinite(price)) continue;
      byDate.set(new Date(ts).toISOString().slice(0, 10), price);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ date, value }));
  }
}
