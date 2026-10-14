import { Global, Module } from '@nestjs/common';
import { CONFIG, loadConfig } from './config';

/** Menyediakan CONFIG ke seluruh modul tanpa perlu import berulang. */
@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => loadConfig() }],
  exports: [CONFIG],
})
export class ConfigModule {}
