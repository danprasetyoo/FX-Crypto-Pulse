import { Controller, Get, HttpCode, Inject, Post, NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../cache/metrics.service';
import { CONFIG, type MarketConfig } from '../config';

@Controller()
export class HealthController {
  constructor(
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
    @Inject(CONFIG) private readonly config: MarketConfig,
  ) {}

  /** GET /api/health: dipakai healthcheck docker compose dan gateway. */
  @Get('health')
  async health() {
    const redis = await this.cache.healthy();
    return {
      status: redis ? 'ok' : 'degraded',
      service: 'market-service',
      redis,
      time: new Date().toISOString(),
    };
  }

  /** GET /api/market/metrics: cache hit ratio dan jumlah 429 (metrik sukses PRD). */
  @Get('market/metrics')
  getMetrics() {
    return this.metrics.snapshot();
  }

  /**
   * POST /api/market/cache/flush: hapus cache segar agar request berikutnya ke upstream.
   * Hanya aktif jika MARKET_ADMIN_ENABLED=true (e2e/staging). Di produksi mengembalikan 404.
   */
  @Post('market/cache/flush')
  @HttpCode(200)
  async flush() {
    if (!this.config.adminEnabled) throw new NotFoundException();
    const deleted = await this.cache.flushFresh();
    return { deleted };
  }

  /** POST /api/market/cache/flush-all: termasuk salinan terakhir dan cooldown. Hanya untuk pengujian. */
  @Post('market/cache/flush-all')
  @HttpCode(200)
  async flushAll() {
    if (!this.config.adminEnabled) throw new NotFoundException();
    const deleted = await this.cache.flushAll();
    this.metrics.reset();
    return { deleted };
  }
}
