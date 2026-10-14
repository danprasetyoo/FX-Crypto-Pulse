import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CacheModule } from './cache/cache.module';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { ConfigModule } from './config.module';
import { ConvertModule } from './convert/convert.module';
import { CryptoModule } from './crypto/crypto.module';
import { FxModule } from './fx/fx.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ConfigModule, CacheModule, FxModule, CryptoModule, ConvertModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
