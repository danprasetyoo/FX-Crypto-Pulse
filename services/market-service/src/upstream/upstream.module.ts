import { Module } from '@nestjs/common';
import { HttpClient } from './http-client';

@Module({
  providers: [HttpClient],
  exports: [HttpClient],
})
export class UpstreamModule {}
