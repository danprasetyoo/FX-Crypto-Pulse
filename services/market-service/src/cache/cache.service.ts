import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DataSource } from '@fxpulse/shared';
import { DataUnavailableError, UpstreamRateLimitedError } from '../common/errors';
import { CACHE_STORE, type CacheStore } from './cache.tokens';
import { MetricsService } from './metrics.service';

export interface Resolved<T> {
  value: T;
  updatedAt: string;
  source: DataSource;
  stale: boolean;
}

interface Entry<T> {
  value: T;
  updatedAt: string;
}

/** Berapa lama salinan "terakhir diketahui" disimpan untuk fallback stale. */
const LAST_KNOWN_TTL_SEC = 7 * 24 * 3600;

/**
 * Aturan cache (FSD bagian 7 dan 8):
 * 1. Request pengguna tidak pernah langsung ke upstream; cache dicek dulu.
 * 2. Cache kosong: ambil sekali. Permintaan bersamaan untuk kunci yang sama digabung (single-flight).
 * 3. Upstream gagal/timeout: kembalikan salinan terakhir dengan stale=true.
 * 4. Upstream 429: tunda request sampai batas cache berikutnya (cooldown), sajikan stale.
 * 5. Tidak ada salinan sama sekali: DataUnavailableError (503) dengan pesan yang jelas.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inflight = new Map<string, Promise<Resolved<unknown>>>();

  constructor(
    @Inject(CACHE_STORE) private readonly store: CacheStore,
    private readonly metrics: MetricsService,
  ) {}

  async getOrFetch<T>(
    key: string,
    ttlSec: number,
    fetcher: () => Promise<T>,
  ): Promise<Resolved<T>> {
    const fresh = await this.read<T>(`fresh:${key}`);
    if (fresh) {
      this.metrics.hit();
      return { value: fresh.value, updatedAt: fresh.updatedAt, source: 'cache', stale: false };
    }
    this.metrics.miss();

    const pending = this.inflight.get(key);
    if (pending) {
      this.metrics.singleFlightJoin();
      return pending as Promise<Resolved<T>>;
    }

    const task = this.refresh(key, ttlSec, fetcher).finally(() => this.inflight.delete(key));
    this.inflight.set(key, task as Promise<Resolved<unknown>>);
    return task;
  }

  private async refresh<T>(
    key: string,
    ttlSec: number,
    fetcher: () => Promise<T>,
  ): Promise<Resolved<T>> {
    const cooldown = await this.store.get(`cooldown:${key}`);
    if (cooldown) {
      this.logger.warn(`Cooldown aktif untuk ${key}; upstream tidak dipanggil.`);
      return this.serveStale<T>(key, new Error('cooldown'));
    }

    this.metrics.upstreamCall();
    try {
      const value = await fetcher();
      const entry: Entry<T> = { value, updatedAt: new Date().toISOString() };
      const json = JSON.stringify(entry);
      await Promise.all([
        this.store.set(`fresh:${key}`, json, ttlSec),
        this.store.set(`last:${key}`, json, LAST_KNOWN_TTL_SEC),
      ]);
      return { value, updatedAt: entry.updatedAt, source: 'live', stale: false };
    } catch (err) {
      this.metrics.upstreamError();
      if (err instanceof UpstreamRateLimitedError) {
        this.metrics.upstreamRateLimited();
        const wait = Math.max(ttlSec, err.retryAfterSec ?? 0);
        await this.store.set(`cooldown:${key}`, '1', wait);
        this.logger.warn(`Upstream 429 untuk ${key}; cooldown ${wait} dtk.`);
      } else {
        this.logger.warn(`Upstream gagal untuk ${key}: ${(err as Error).message}`);
      }
      return this.serveStale<T>(key, err);
    }
  }

  private async serveStale<T>(key: string, cause: unknown): Promise<Resolved<T>> {
    const last = await this.read<T>(`last:${key}`);
    if (!last) {
      this.logger.error(
        `Tidak ada cache untuk ${key} dan upstream gagal: ${(cause as Error)?.message}`,
      );
      throw new DataUnavailableError();
    }
    this.metrics.staleServed();
    return { value: last.value, updatedAt: last.updatedAt, source: 'cache', stale: true };
  }

  private async read<T>(fullKey: string): Promise<Entry<T> | null> {
    const raw = await this.store.get(fullKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Entry<T>;
    } catch {
      await this.store.del(fullKey);
      return null;
    }
  }

  /** Hapus cache segar (bukan salinan terakhir) agar request berikutnya memanggil upstream. */
  async flushFresh(): Promise<number> {
    return this.store.delByPrefix('fresh:');
  }

  /** Hapus semua termasuk salinan terakhir dan cooldown. Hanya untuk pengujian. */
  async flushAll(): Promise<number> {
    const a = await this.store.delByPrefix('fresh:');
    const b = await this.store.delByPrefix('last:');
    const c = await this.store.delByPrefix('cooldown:');
    return a + b + c;
  }

  async healthy(): Promise<boolean> {
    return this.store.ping();
  }
}
