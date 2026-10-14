import { Controller, Get, Query } from '@nestjs/common';
import {
  CRYPTO_VS_CURRENCIES,
  type ApiEnvelope,
  type CryptoHistoryData,
  type CryptoTopData,
} from '@fxpulse/shared';
import { envelope } from '../common/envelope';
import { BadRequestError } from '../common/errors';
import { parseCoinId, parseList, parseRange } from '../common/query';
import { CryptoService } from './crypto.service';

@Controller('crypto')
export class CryptoController {
  constructor(private readonly crypto: CryptoService) {}

  /** GET /api/crypto/top?vs=idr,usd */
  @Get('top')
  async top(@Query('vs') vs?: string): Promise<ApiEnvelope<CryptoTopData>> {
    const list = parseList(vs, [...CRYPTO_VS_CURRENCIES], (s) => s.toLowerCase());
    for (const v of list) {
      if (!/^[a-z]{3,4}$/.test(v))
        throw new BadRequestError(`Mata uang kuotasi tidak valid: ${v}.`);
    }
    if (list.length > 3) throw new BadRequestError('Maksimal 3 mata uang kuotasi.');
    return envelope(await this.crypto.top(list));
  }

  /** GET /api/crypto/history?id=bitcoin&vs=idr&range=90 */
  @Get('history')
  async history(
    @Query('id') id?: string,
    @Query('vs') vs?: string,
    @Query('range') range?: string,
  ): Promise<ApiEnvelope<CryptoHistoryData>> {
    const coin = parseCoinId(id);
    const cur = (vs ?? 'idr').trim().toLowerCase();
    if (!/^[a-z]{3,4}$/.test(cur)) throw new BadRequestError('Mata uang kuotasi tidak valid.');
    return envelope(await this.crypto.history(coin, cur, parseRange(range, 90)));
  }
}
