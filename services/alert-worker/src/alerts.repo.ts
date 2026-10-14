import type { Pool } from 'pg';
import type { AlertCondition, AssetType } from '@fxpulse/shared';

export interface ActiveAlert {
  id: string;
  userId: string;
  email: string;
  type: AssetType;
  assetCode: string;
  condition: AlertCondition;
  target: number;
  currency: string;
  activation: number;
}

export interface AlertsRepo {
  loadActive(): Promise<ActiveAlert[]>;
  /**
   * Dalam SATU transaksi: ubah status ke terpicu dan buat baris notifikasi.
   * Mengembalikan false jika alert sudah tidak aktif (dipicu proses lain / dinonaktifkan).
   */
  markTriggered(alert: ActiveAlert, price: number): Promise<boolean>;
}

interface Row {
  id: string;
  user_id: string;
  email: string;
  type: AssetType;
  asset_code: string;
  condition: AlertCondition;
  target: string;
  currency: string;
  activation: number;
}

export class PgAlertsRepo implements AlertsRepo {
  constructor(private readonly pool: Pool) {}

  async loadActive(): Promise<ActiveAlert[]> {
    const r = await this.pool.query<Row>(
      `SELECT a.id, a.user_id, u.email, a.type, a.asset_code, a.condition, a.target, a.currency, a.activation
       FROM alerts a JOIN users u ON u.id = a.user_id
       WHERE a.status = 'active'
       ORDER BY a.created_at ASC`,
    );
    return r.rows.map((x) => ({
      id: x.id,
      userId: x.user_id,
      email: x.email,
      type: x.type,
      assetCode: x.asset_code,
      condition: x.condition,
      target: Number(x.target),
      currency: x.currency,
      activation: x.activation,
    }));
  }

  async markTriggered(alert: ActiveAlert, price: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query(
        `UPDATE alerts SET status = 'triggered', triggered_at = now(), updated_at = now()
         WHERE id = $1 AND status = 'active' AND activation = $2`,
        [alert.id, alert.activation],
      );
      if (upd.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        `INSERT INTO notifications (alert_id, activation, channel, status, price)
         VALUES ($1, $2, 'email', 'sent', $3)`,
        [alert.id, alert.activation, price],
      );
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}
