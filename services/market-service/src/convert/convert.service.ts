import { Injectable } from '@nestjs/common';
import type { ApiEnvelope, AssetType, ConvertData } from '@fxpulse/shared';
import { combine } from '../common/envelope';
import { BadRequestError } from '../common/errors';
import type { Resolved } from '../cache/cache.service';
import { CryptoService } from '../crypto/crypto.service';
import { FxService } from '../fx/fx.service';

interface PricedAsset {
  code: string;
  type: AssetType;
  /** Nilai 1 unit aset dalam IDR. */
  idr: number;
}

/**
 * Konverter (F5): semua aset dinilai dalam IDR dari data cache terbaru,
 * lalu hasil = amount * idr(from) / idr(to). Aset kripto dibatasi pada top-20
 * karena hanya itu yang ada di cache (menghindari request upstream tambahan).
 */
@Injectable()
export class ConvertService {
  constructor(
    private readonly fx: FxService,
    private readonly crypto: CryptoService,
  ) {}

  static classify(code: string): { type: AssetType; code: string } {
    const trimmed = code.trim();
    if (/^[A-Za-z]{3}$/.test(trimmed)) return { type: 'fx', code: trimmed.toUpperCase() };
    if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed))
      return { type: 'crypto', code: trimmed.toLowerCase() };
    throw new BadRequestError(`Aset tidak dikenali: ${trimmed}.`);
  }

  async convert(fromRaw: string, toRaw: string, amount: number): Promise<ApiEnvelope<ConvertData>> {
    const from = ConvertService.classify(fromRaw);
    const to = ConvertService.classify(toRaw);
    const parts: Resolved<unknown>[] = [];

    const fxCodes = [from, to]
      .filter((a) => a.type === 'fx' && a.code !== 'IDR')
      .map((a) => a.code);
    let fxIdr: Record<string, number> = { IDR: 1 };
    if (fxCodes.length) {
      const latest = await this.fx.latest('IDR', Array.from(new Set(fxCodes)));
      parts.push(latest);
      for (const r of latest.value.rates) fxIdr[r.quote] = r.rate;
    } else if (from.type === 'fx' || to.type === 'fx') {
      // Hanya IDR yang terlibat; tetap sertakan waktu data FX agar envelope punya updatedAt.
      fxIdr = { IDR: 1 };
    }

    let cryptoIdr: Record<string, number> = {};
    if (from.type === 'crypto' || to.type === 'crypto') {
      const top = await this.crypto.top(['idr']);
      parts.push(top);
      cryptoIdr = Object.fromEntries(top.value.assets.map((a) => [a.id, a.price.idr]));
    }

    const price = (a: { type: AssetType; code: string }): PricedAsset => {
      const idr = a.type === 'fx' ? fxIdr[a.code] : cryptoIdr[a.code];
      if (idr === undefined || !Number.isFinite(idr) || idr <= 0) {
        throw new BadRequestError(
          a.type === 'crypto'
            ? `Aset kripto ${a.code} tidak tersedia. Konverter mendukung top-20 aset.`
            : `Mata uang ${a.code} tidak tersedia.`,
          { asset: a.code },
          'ASSET_NOT_AVAILABLE',
        );
      }
      return { ...a, idr };
    };

    const f = price(from);
    const t = price(to);
    const rate = f.idr / t.idr;
    const value: ConvertData = {
      from: f.code,
      to: t.code,
      amount,
      result: amount * rate,
      rate,
      fromType: f.type,
      toType: t.type,
    };
    if (parts.length === 0) {
      // IDR -> IDR: tidak ada sumber data, anggap live sekarang.
      return { data: value, updatedAt: new Date().toISOString(), source: 'live', stale: false };
    }
    return combine(parts, value);
  }
}
