import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, {
    logger:
      config.logLevel === 'debug' ? ['log', 'error', 'warn', 'debug'] : ['log', 'error', 'warn'],
  });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  // Gateway nginx yang menangani CORS/asal; layanan ini tidak diekspos langsung ke browser.
  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `market-service listening on :${config.port} (redis=${config.redisUrl})`,
  );
}

bootstrap().catch((err) => {
  console.error('market-service gagal start', err);
  process.exit(1);
});
