import { Controller, Get } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Controller()
export class HealthController {
  constructor(private readonly db: DbService) {}

  /** GET /api/health (di gateway dipetakan ke /api/health/user). */
  @Get('health')
  async health() {
    const database = await this.db.healthy();
    return {
      status: database ? 'ok' : 'degraded',
      service: 'user-service',
      database,
      time: new Date().toISOString(),
    };
  }
}
