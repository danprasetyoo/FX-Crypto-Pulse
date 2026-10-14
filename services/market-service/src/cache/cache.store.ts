import Redis from 'ioredis';

/**
 * Abstraksi penyimpanan cache agar logika cache bisa diuji tanpa Redis.
 * Produksi memakai RedisCacheStore; unit test memakai MemoryCacheStore.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Hapus semua kunci dengan prefix (dipakai endpoint admin flush). */
  delByPrefix(prefix: string): Promise<number>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export class MemoryCacheStore implements CacheStore {
  private readonly map = new Map<string, { value: string; expiresAt: number }>();
  constructor(private readonly now: () => number = () => Date.now()) {}

  async get(key: string): Promise<string | null> {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt <= this.now()) {
      this.map.delete(key);
      return null;
    }
    return e.value;
  }
  async set(key: string, value: string, ttlSec: number): Promise<void> {
    this.map.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
  }
  async del(...keys: string[]): Promise<void> {
    for (const k of keys) this.map.delete(k);
  }
  async delByPrefix(prefix: string): Promise<number> {
    let n = 0;
    for (const k of Array.from(this.map.keys())) {
      if (k.startsWith(prefix)) {
        this.map.delete(k);
        n++;
      }
    }
    return n;
  }
  async ping(): Promise<boolean> {
    return true;
  }
  async close(): Promise<void> {
    this.map.clear();
  }
}

export class RedisCacheStore implements CacheStore {
  private readonly redis: Redis;

  constructor(
    url: string,
    private readonly keyPrefix = 'market:',
  ) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    // Tanpa handler ini ioredis melempar 'unhandled error' saat Redis belum siap.
    this.redis.on('error', (err) => {
      console.warn(`[cache] redis error: ${err.message}`);
    });
  }

  private k(key: string): string {
    return this.keyPrefix + key;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(this.k(key));
    } catch {
      return null; // Redis bermasalah = anggap cache miss, jangan gagalkan request.
    }
  }
  async set(key: string, value: string, ttlSec: number): Promise<void> {
    try {
      await this.redis.set(this.k(key), value, 'EX', Math.max(1, Math.floor(ttlSec)));
    } catch {
      /* diabaikan, lihat get() */
    }
  }
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys.map((k) => this.k(k)));
    } catch {
      /* diabaikan */
    }
  }
  async delByPrefix(prefix: string): Promise<number> {
    let cursor = '0';
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.k(prefix)}*`,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length) count += await this.redis.del(...keys);
    } while (cursor !== '0');
    return count;
  }
  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
  async close(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
