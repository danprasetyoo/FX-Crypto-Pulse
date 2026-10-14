import { Module } from '@nestjs/common';
import { UpstreamModule } from '../upstream/upstream.module';
import { FrankfurterClient } from './frankfurter.client';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';

@Module({
  imports: [UpstreamModule],
  controllers: [FxController],
  providers: [FrankfurterClient, FxService],
  exports: [FxService],
})
export class FxModule {}
