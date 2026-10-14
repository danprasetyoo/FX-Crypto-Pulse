import { Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_FX_BASE,
  DEFAULT_FX_QUOTES,
  type ApiEnvelope,
  type FxCurrenciesData,
  type FxHistoryData,
  type FxLatestData,
} from '@fxpulse/shared';
import { envelope } from '../common/envelope';
import { BadRequestError } from '../common/errors';
import { parseCurrencyCode, parseList, parseRange } from '../common/query';
import { FxService } from './fx.service';

@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  /** GET /api/fx/latest?base=IDR&quotes=USD,EUR,SGD */
  @Get('latest')
  async latest(
    @Query('base') base?: string,
    @Query('quotes') quotes?: string,
  ): Promise<ApiEnvelope<FxLatestData>> {
    const b = base ? parseCurrencyCode(base, 'base') : DEFAULT_FX_BASE;
    const q = parseList(quotes, [...DEFAULT_FX_QUOTES], (s) =>
      parseCurrencyCode(s, 'quotes'),
    ).filter((c) => c !== b);
    if (q.length === 0) throw new BadRequestError('Minimal satu mata uang quotes selain base.');
    if (q.length > 20) throw new BadRequestError('Maksimal 20 mata uang per permintaan.');
    return envelope(await this.fx.latest(b, q));
  }

  /** GET /api/fx/history?pair=USD-IDR&range=30 */
  @Get('history')
  async history(
    @Query('pair') pair?: string,
    @Query('range') range?: string,
  ): Promise<ApiEnvelope<FxHistoryData>> {
    const m = /^([A-Za-z]{3})-([A-Za-z]{3})$/.exec((pair ?? '').trim());
    if (!m) throw new BadRequestError('Parameter pair harus berformat XXX-YYY, contoh USD-IDR.');
    const normalized = `${m[1].toUpperCase()}-${m[2].toUpperCase()}`;
    if (m[1].toUpperCase() === m[2].toUpperCase())
      throw new BadRequestError('Pasangan harus dua mata uang berbeda.');
    return envelope(await this.fx.history(normalized, parseRange(range)));
  }

  /** GET /api/fx/currencies */
  @Get('currencies')
  async currencies(): Promise<ApiEnvelope<FxCurrenciesData>> {
    const r = await this.fx.currencies();
    return envelope({ ...r, value: { currencies: r.value } });
  }
}
