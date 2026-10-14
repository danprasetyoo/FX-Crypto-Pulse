import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { FxModule } from '../fx/fx.module';
import { ConvertController } from './convert.controller';
import { ConvertService } from './convert.service';

@Module({
  imports: [FxModule, CryptoModule],
  controllers: [ConvertController],
  providers: [ConvertService],
})
export class ConvertModule {}
