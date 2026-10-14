import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { CONFIG, type UserConfig } from '../config';
import { runMigrations } from './migrate';

/** Pool PostgreSQL + helper query/transaksi. Migrasi dijalankan saat modul init. */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  readonly pool: Pool;

  constructor(@Inject(CONFIG) config: UserConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
    this.pool.on('error', (err) => this.logger.error(`pg pool error: ${err.message}`));
  }

  async onModuleInit(): Promise<void> {
    // Tunggu database siap (compose depends_on healthy biasanya cukup, ini pengaman).
    let lastErr: unknown;
    for (let i = 0; i < 20; i++) {
      try {
        await this.pool.query('SELECT 1');
        lastErr = undefined;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (lastErr) throw lastErr;
    const applied = await runMigrations(this.pool);
    if (applied.length) this.logger.log(`Migrasi diterapkan: ${applied.join(', ')}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end().catch(() => undefined);
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async healthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
