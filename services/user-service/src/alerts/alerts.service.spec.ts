import { AlertsService, validateAlertInput } from './alerts.service';
import type { DbService } from '../db/db.service';
import { NotFoundError, ValidationError } from '../common/errors';

describe('validateAlertInput', () => {
  it('alert FX wajib IDR dan bukan IDR sebagai aset', () => {
    expect(() => validateAlertInput('fx', 'USD', 'IDR')).not.toThrow();
    expect(() => validateAlertInput('fx', 'USD', 'USD')).toThrow(ValidationError);
    expect(() => validateAlertInput('fx', 'IDR', 'IDR')).toThrow(ValidationError);
    expect(() => validateAlertInput('fx', 'US', 'IDR')).toThrow(ValidationError);
  });
  it('alert kripto menerima IDR dan USD', () => {
    expect(() => validateAlertInput('crypto', 'bitcoin', 'IDR')).not.toThrow();
    expect(() => validateAlertInput('crypto', 'bitcoin', 'USD')).not.toThrow();
    expect(() => validateAlertInput('crypto', 'Bit Coin', 'USD')).toThrow(ValidationError);
  });
});

describe('AlertsService', () => {
  const row = {
    id: 'a1',
    type: 'crypto',
    asset_code: 'bitcoin',
    condition: 'below',
    target: '900000000.0000000000',
    currency: 'IDR',
    status: 'active',
    triggered_at: null,
    created_at: new Date('2026-10-10T00:00:00Z'),
    updated_at: new Date('2026-10-10T00:00:00Z'),
  };

  const mockQuery = (result: { rows: unknown[]; rowCount: number }) =>
    jest.fn((_sql: string, _params?: unknown[]) => Promise.resolve(result));

  it('create menormalisasi kode aset dan memetakan numeric ke number', async () => {
    const query = mockQuery({ rows: [row], rowCount: 1 });
    const svc = new AlertsService({ query } as unknown as DbService);
    const a = await svc.create('u1', {
      type: 'crypto',
      assetCode: 'BitCoin',
      condition: 'below',
      target: 9e8,
      currency: 'IDR',
    });
    expect(query.mock.calls[0][1]).toEqual(['u1', 'crypto', 'bitcoin', 'below', 9e8, 'IDR']);
    expect(a.target).toBe(900000000);
    expect(a.status).toBe('active');
  });

  it('update status active menaikkan activation hanya jika sebelumnya tidak aktif', async () => {
    const query = mockQuery({ rows: [row], rowCount: 1 });
    const svc = new AlertsService({ query } as unknown as DbService);
    await svc.update('u1', 'a1', { status: 'active', target: 1 });
    const sql = query.mock.calls[0][0];
    expect(sql).toContain(
      "activation = CASE WHEN status = 'active' THEN activation ELSE activation + 1 END",
    );
    expect(sql).toContain('triggered_at = NULL');
    expect(query.mock.calls[0][1]).toEqual(['a1', 'u1', 1]);
  });

  it('update tanpa perubahan ditolak, alert orang lain tidak ditemukan', async () => {
    const query = mockQuery({ rows: [], rowCount: 0 });
    const svc = new AlertsService({ query } as unknown as DbService);
    await expect(svc.update('u1', 'a1', {})).rejects.toBeInstanceOf(ValidationError);
    await expect(svc.update('u2', 'a1', { target: 2 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.remove('u2', 'a1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
