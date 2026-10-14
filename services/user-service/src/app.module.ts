import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { ConfigModule } from './config.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [ConfigModule, DbModule, AuthModule, WatchlistModule, AlertsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
