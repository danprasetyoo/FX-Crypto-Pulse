import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, type MarketConfig } from '../config';
import { HttpClient } from '../upstream/http-client';

/** Bentuk respons Frankfurter (https://frankfurter.dev). */
export interface FrankfurterSeries {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  /** tanggal -> { kode: rate } */
  rates: Record<string, Record<string, number>>;
}

export interface FrankfurterLatest {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Klien tipis ke Frankfurter. Semua panggilan memakai base EUR (native ECB,
 * presisi penuh) lalu kurs silang dihitung di FxService. Dengan base selain EUR
 * Frankfurter membulatkan hasil ke beberapa digit saja, dan untuk base IDR
 * nilainya menjadi terlalu kecil (6e-05) sehingga presisi hilang.
 */
@Injectable()
export class FrankfurterClient {
  constructor(
    private readonly http: HttpClient,
    @Inject(CONFIG) private readonly config: MarketConfig,
  ) {}

  /** Rentang tanggal; end kosong = sampai data terakhir. Hasil per tanggal kerja ECB. */
  series(startDate: string, endDate: string | null, symbols: string[]): Promise<FrankfurterSeries> {
    const sym = symbols.filter((s) => s !== 'EUR');
    const url = new URL(`${this.config.frankfurterBaseUrl}/${startDate}..${endDate ?? ''}`);
    url.searchParams.set('base', 'EUR');
    if (sym.length) url.searchParams.set('symbols', sym.join(','));
    return this.http.getJson<FrankfurterSeries>(url.toString());
  }

  currencies(): Promise<Record<string, string>> {
    return this.http.getJson<Record<string, string>>(
      `${this.config.frankfurterBaseUrl}/currencies`,
    );
  }
}
