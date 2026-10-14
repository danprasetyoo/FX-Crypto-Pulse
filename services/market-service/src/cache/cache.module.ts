import { Global, Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { CONFIG, type MarketConfig } from '../config';
import { CacheService } from './cache.service';
import { MemoryCacheStore, RedisCacheStore, type CacheStore } from './cache.store';
import { CACHE_STORE } from './cache.tokens';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [
    {
      provide: CACHE_STORE,
      inject: [CONFIG],
      useFactory: (config: MarketConfig): CacheStore =>
        config.redisUrl === 'memory'
          ? new MemoryCacheStore()
          : new RedisCacheStore(config.redisUrl),
    },
    MetricsService,
    CacheService,
  ],
  exports: [CACHE_STORE, CacheService, MetricsService],
})
export class CacheModule implements OnApplicationShutdown {
  constructor(@Inject(CACHE_STORE) private readonly store: CacheStore) {}
  async onApplicationShutdown(): Promise<void> {
    await this.store.close();
  }
}
