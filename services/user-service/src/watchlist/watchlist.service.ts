import { Injectable } from '@nestjs/common';
import type { AssetType, WatchlistItem } from '@fxpulse/shared';
import { ConflictError, NotFoundError, ValidationError } from '../common/errors';
import { DbService } from '../db/db.service';
import { normalizeAssetCode } from './dto';

interface Row {
  id: string;
  type: AssetType;
  asset_code: string;
  created_at: Date;
}

const toItem = (r: Row): WatchlistItem => ({
  id: r.id,
  type: r.type,
  assetCode: r.asset_code,
  createdAt: new Date(r.created_at).toISOString(),
});

@Injectable()
export class WatchlistService {
  constructor(private readonly db: DbService) {}

  async list(userId: string): Promise<WatchlistItem[]> {
    const r = await this.db.query<Row>(
      'SELECT id, type, asset_code, created_at FROM watchlist_items WHERE user_id = $1 ORDER BY created_at ASC',
      [userId],
    );
    return r.rows.map(toItem);
  }

  async add(userId: string, type: AssetType, assetCodeRaw: string): Promise<WatchlistItem> {
    const assetCode = normalizeAssetCode(type, assetCodeRaw);
    if (type === 'fx' && !/^[A-Z]{3}$/.test(assetCode))
      throw new ValidationError('Kode mata uang harus 3 huruf.');
    if (type === 'crypto' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(assetCode))
      throw new ValidationError('ID aset kripto tidak valid.');
    const r = await this.db.query<Row>(
      `INSERT INTO watchlist_items (user_id, type, asset_code) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, type, asset_code) DO NOTHING
       RETURNING id, type, asset_code, created_at`,
      [userId, type, assetCode],
    );
    if (!r.rows[0]) throw new ConflictError('Aset sudah ada di watchlist.', 'ALREADY_IN_WATCHLIST');
    return toItem(r.rows[0]);
  }

  async remove(userId: string, id: string): Promise<void> {
    const r = await this.db.query('DELETE FROM watchlist_items WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    if (r.rowCount === 0) throw new NotFoundError('Item watchlist tidak ditemukan.');
  }
}
