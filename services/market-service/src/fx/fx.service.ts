import { Inject, Injectable } from '@nestjs/common';
import {
  pctChange,
  type FxHistoryData,
  type FxLatestData,
  type FxRate,
  type HistoryRange,
} from '@fxpulse/shared';
import { CacheService, type Resolved } from '../cache/cache.service';
import { CONFIG, type MarketConfig } from '../config';
import { UnsupportedCurrencyError } from '../common/errors';
import { FrankfurterClient, type FrankfurterSeries } from './frankfurter.client';

/** Format tanggal YYYY-MM-DD dalam UTC. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from.getTime() - days * 86_400_000);
  return isoDate(d);
}

/** Mengambil rate EUR->code; EUR sendiri = 1. */
function eurRate(rates: Record<string, number>, code: string): number | null {
  if (code === 'EUR') return 1;
  const r = rates[code];
  return typeof r === 'number' && r > 0 ? r : null;
}

/** Kurs silang: berapa `base` untuk 1 `quote` = r[base] / r[quote]. */
function cross(rates: Record<string, number>, quote: string, base: string): number | null {
  const rb = eurRate(rates, base);
  const rq = eurRate(rates, quote);
  if (rb === null || rq === null) return null;
  return rb / rq;
}

@Injectable()
export class FxService {
  constructor(
    private readonly cache: CacheService,
    private readonly frankfurter: FrankfurterClient,
    @Inject(CONFIG) private readonly config: MarketConfig,
  ) {}

  /** Daftar mata uang yang didukung (cache 24 jam). */
  currencies(): Promise<Resolved<Record<string, string>>> {
    return this.cache.getOrFetch('fx:currencies', this.config.ttl.fxCurrenciesSec, () =>
      this.frankfurter.currencies(),
    );
  }

  /** Menolak kode yang tidak didukung dan mengembalikan daftar yang didukung (FSD bagian 8). */
  async assertSupported(codes: string[]): Promise<void> {
    const { value } = await this.currencies();
    const supported = Object.keys(value).sort();
    const unsupported = codes.filter((c) => !(c in value));
    if (unsupported.length) throw new UnsupportedCurrencyError(unsupported, supported);
  }

  /**
   * Kurs terbaru untuk beberapa quote terhadap base, dengan perubahan harian
   * terhadap hari kerja ECB sebelumnya (F1).
   */
  async latest(base: string, quotes: string[]): Promise<Resolved<FxLatestData>> {
    await this.assertSupported([base, ...quotes]);
    const symbols = Array.from(new Set([base, ...quotes])).sort();
    const key = `fx:latest:${symbols.join(',')}`;
    // 14 hari ke belakang cukup untuk selalu mendapat minimal dua hari kerja ECB.
    const series = await this.cache.getOrFetch(key, this.config.ttl.fxSec, () =>
      this.frankfurter.series(daysAgo(14), null, symbols),
    );
    return { ...series, value: FxService.toLatest(series.value, base, quotes) };
  }

  static toLatest(series: FrankfurterSeries, base: string, quotes: string[]): FxLatestData {
    const dates = Object.keys(series.rates).sort();
    const lastDate = dates[dates.length - 1];
    const prevDate = dates.length >= 2 ? dates[dates.length - 2] : null;
    const last = lastDate ? series.rates[lastDate] : {};
    const prev = prevDate ? series.rates[prevDate] : null;

    const rates: FxRate[] = quotes.map((quote) => {
      const rate = cross(last, quote, base) ?? NaN;
      const previousRate = prev ? cross(prev, quote, base) : null;
      return {
        quote,
        base,
        rate,
        previousRate,
        changePct: Number.isFinite(rate) ? pctChange(rate, previousRate) : null,
        date: lastDate ?? series.end_date,
        previousDate: prevDate,
      };
    });
    return { base, date: lastDate ?? series.end_date, rates };
  }

  /** Riwayat pasangan, nilai = quote per 1 base. Contoh USD-IDR = IDR per USD (F3). */
  async history(pair: string, range: HistoryRange): Promise<Resolved<FxHistoryData>> {
    const [base, quote] = pair.split('-');
    await this.assertSupported([base, quote]);
    const symbols = Array.from(new Set([base, quote])).sort();
    const key = `fx:history:${symbols.join(',')}:${range}`;
    const series = await this.cache.getOrFetch(key, this.config.ttl.fxSec, () =>
      this.frankfurter.series(daysAgo(range), null, symbols),
    );
    const points = Object.keys(series.value.rates)
      .sort()
      .map((date) => ({ date, value: cross(series.value.rates[date], base, quote) }))
      .filter(
        (p): p is { date: string; value: number } => p.value !== null && Number.isFinite(p.value),
      );
    return { ...series, value: { pair, base, quote, range, points } };
  }
}
