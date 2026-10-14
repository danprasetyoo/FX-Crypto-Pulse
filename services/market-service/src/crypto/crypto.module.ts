import { Module } from '@nestjs/common';
import { UpstreamModule } from '../upstream/upstream.module';
import { CoinGeckoClient } from './coingecko.client';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

@Module({
  imports: [UpstreamModule],
  controllers: [CryptoController],
  providers: [CoinGeckoClient, CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
