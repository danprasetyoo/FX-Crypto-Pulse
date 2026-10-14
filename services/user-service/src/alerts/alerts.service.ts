import { Injectable } from '@nestjs/common';
import type { Alert, AlertCondition, AlertStatus, AssetType } from '@fxpulse/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { DbService } from '../db/db.service';
import { normalizeAssetCode } from '../watchlist/dto';

export interface AlertRow {
  id: string;
  type: AssetType;
  asset_code: string;
  condition: AlertCondition;
  target: string; // numeric dari pg datang sebagai string
  currency: string;
  status: AlertStatus;
  triggered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const toAlert = (r: AlertRow): Alert => ({
  id: r.id,
  type: r.type,
  assetCode: r.asset_code,
  condition: r.condition,
  target: Number(r.target),
  currency: r.currency,
  status: r.status,
  triggeredAt: r.triggered_at ? new Date(r.triggered_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

const COLS =
  'id, type, asset_code, condition, target, currency, status, triggered_at, created_at, updated_at';

export interface CreateAlertArgs {
  type: AssetType;
  assetCode: string;
  condition: AlertCondition;
  target: number;
  currency: string;
}

export interface UpdateAlertArgs {
  target?: number;
  condition?: AlertCondition;
  status?: 'active' | 'inactive';
}

/** Validasi aturan bisnis yang tidak bisa diekspresikan oleh class-validator. */
export function validateAlertInput(type: AssetType, assetCode: string, currency: string): void {
  if (type === 'fx') {
    if (!/^[A-Z]{3}$/.test(assetCode)) throw new ValidationError('Kode mata uang harus 3 huruf.');
    if (assetCode === 'IDR')
      throw new ValidationError('Pilih mata uang selain IDR; target dinyatakan dalam IDR.');
    if (currency !== 'IDR')
      throw new ValidationError('Alert kurs FX hanya mendukung target dalam IDR.');
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(assetCode)) {
    throw new ValidationError('ID aset kripto tidak valid.');
  }
}

@Injectable()
export class AlertsService {
  constructor(private readonly db: DbService) {}

  async list(userId: string): Promise<Alert[]> {
    const r = await this.db.query<AlertRow>(
      `SELECT ${COLS} FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return r.rows.map(toAlert);
  }

  async create(userId: string, input: CreateAlertArgs): Promise<Alert> {
    const assetCode = normalizeAssetCode(input.type, input.assetCode);
    validateAlertInput(input.type, assetCode, input.currency);
    const r = await this.db.query<AlertRow>(
      `INSERT INTO alerts (user_id, type, asset_code, condition, target, currency)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
      [userId, input.type, assetCode, input.condition, input.target, input.currency],
    );
    return toAlert(r.rows[0]);
  }

  /**
   * Mengubah target/kondisi, atau mengaktifkan kembali alert yang sudah terpicu.
   * Aktivasi ulang menaikkan kolom activation sehingga notifikasi berikutnya
   * tetap tepat satu per aktivasi.
   */
  async update(userId: string, id: string, input: UpdateAlertArgs): Promise<Alert> {
    if (input.target === undefined && input.condition === undefined && input.status === undefined) {
      throw new ValidationError('Tidak ada perubahan yang diminta.');
    }
    const sets: string[] = ['updated_at = now()'];
    const params: unknown[] = [id, userId];
    const push = (expr: string, value: unknown) => {
      params.push(value);
      sets.push(`${expr} = $${params.length}`);
    };
    if (input.target !== undefined) push('target', input.target);
    if (input.condition !== undefined) push('condition', input.condition);
    if (input.status === 'active') {
      // Hanya menaikkan activation jika sebelumnya tidak aktif (idempoten untuk alert yang sudah aktif).
      sets.push(`activation = CASE WHEN status = 'active' THEN activation ELSE activation + 1 END`);
      sets.push(`triggered_at = NULL`);
      sets.push(`status = 'active'`);
    } else if (input.status === 'inactive') {
      sets.push(`status = 'inactive'`);
    }
    const r = await this.db.query<AlertRow>(
      `UPDATE alerts SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
      params,
    );
    if (!r.rows[0]) throw new NotFoundError('Alert tidak ditemukan.');
    return toAlert(r.rows[0]);
  }

  async remove(userId: string, id: string): Promise<void> {
    const r = await this.db.query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    if (r.rowCount === 0) throw new NotFoundError('Alert tidak ditemukan.');
  }
}
