import { ConvertService } from './convert.service';
import type { FxService } from '../fx/fx.service';
import type { CryptoService } from '../crypto/crypto.service';
import { BadRequestError } from '../common/errors';

const fx = {
  latest: jest.fn(async (_base: string, quotes: string[]) => ({
    value: {
      base: 'IDR',
      date: '2026-10-10',
      rates: quotes.map((q) => ({
        quote: q,
        base: 'IDR',
        rate: q === 'USD' ? 16250 : 18910,
        previousRate: null,
        changePct: null,
        date: '2026-10-10',
        previousDate: null,
      })),
    },
    updatedAt: '2026-10-10T07:00:00.000Z',
    source: 'cache' as const,
    stale: false,
  })),
} as unknown as FxService;

const crypto = {
  top: jest.fn(async () => ({
    value: {
      vs: ['idr'],
      assets: [
        {
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          image: null,
          marketCapRank: 1,
          price: { idr: 1_410_000_000 },
          change24hPct: { idr: 1 },
        },
      ],
    },
    updatedAt: '2026-10-10T07:05:00.000Z',
    source: 'live' as const,
    stale: true,
  })),
} as unknown as CryptoService;

describe('ConvertService', () => {
  const svc = new ConvertService(fx, crypto);

  it('USD -> IDR memakai kurs cache', async () => {
    const r = await svc.convert('USD', 'IDR', 100);
    expect(r.data.result).toBe(1_625_000);
    expect(r.data.rate).toBe(16250);
    expect(r.updatedAt).toBe('2026-10-10T07:00:00.000Z');
    expect(r.stale).toBe(false);
  });

  it('bitcoin -> USD menggabungkan dua sumber dan mewarisi stale', async () => {
    const r = await svc.convert('bitcoin', 'USD', 1);
    expect(r.data.result).toBeCloseTo(1_410_000_000 / 16250, 6);
    expect(r.data.fromType).toBe('crypto');
    expect(r.data.toType).toBe('fx');
    expect(r.stale).toBe(true);
    expect(r.updatedAt).toBe('2026-10-10T07:00:00.000Z'); // paling lama dari dua sumber
  });

  it('IDR -> IDR = identitas', async () => {
    const r = await svc.convert('IDR', 'IDR', 5);
    expect(r.data.result).toBe(5);
  });

  it('aset kripto di luar top-20 ditolak dengan pesan jelas', async () => {
    await expect(svc.convert('dogecoin-xyz', 'IDR', 1)).rejects.toBeInstanceOf(BadRequestError);
  });
});
