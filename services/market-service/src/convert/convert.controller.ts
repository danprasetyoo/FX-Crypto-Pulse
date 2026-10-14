import { Controller, Get, Query } from '@nestjs/common';
import type { ApiEnvelope, ConvertData } from '@fxpulse/shared';
import { BadRequestError } from '../common/errors';
import { parseAmount } from '../common/query';
import { ConvertService } from './convert.service';

@Controller('convert')
export class ConvertController {
  constructor(private readonly convert: ConvertService) {}

  /** GET /api/convert?from=USD&to=IDR&amount=100 */
  @Get()
  async get(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('amount') amount?: string,
  ): Promise<ApiEnvelope<ConvertData>> {
    if (!from || !to) throw new BadRequestError('Parameter from dan to wajib diisi.');
    return this.convert.convert(from, to, parseAmount(amount));
  }
}
