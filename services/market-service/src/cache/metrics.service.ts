import { Injectable } from '@nestjs/common';

export interface MetricsSnapshot {
  cacheHits: number;
  cacheMisses: number;
  /** Rasio hit (0..1). Target PRD: >= 0,9 saat uji beban. */
  cacheHitRatio: number;
  upstreamCalls: number;
  upstreamErrors: number;
  /** Jumlah respons 429 dari upstream. Target PRD: 0 selama 48 jam. */
  upstreamRateLimited: number;
  staleServed: number;
  singleFlightJoins: number;
  startedAt: string;
}

/**
 * Penghitung sederhana di memori proses. Cukup untuk metrik sukses PRD
 * (cache hit ratio dan jumlah 429) dan dibaca lewat GET /api/market/metrics.
 */
@Injectable()
export class MetricsService {
  private hits = 0;
  private misses = 0;
  private upstreamCalls = 0;
  private upstreamErrors = 0;
  private rateLimited = 0;
  private stale = 0;
  private joins = 0;
  private readonly startedAt = new Date().toISOString();

  hit(): void {
    this.hits++;
  }
  miss(): void {
    this.misses++;
  }
  upstreamCall(): void {
    this.upstreamCalls++;
  }
  upstreamError(): void {
    this.upstreamErrors++;
  }
  upstreamRateLimited(): void {
    this.rateLimited++;
  }
  staleServed(): void {
    this.stale++;
  }
  singleFlightJoin(): void {
    this.joins++;
  }

  snapshot(): MetricsSnapshot {
    const total = this.hits + this.misses;
    return {
      cacheHits: this.hits,
      cacheMisses: this.misses,
      cacheHitRatio: total === 0 ? 0 : this.hits / total,
      upstreamCalls: this.upstreamCalls,
      upstreamErrors: this.upstreamErrors,
      upstreamRateLimited: this.rateLimited,
      staleServed: this.stale,
      singleFlightJoins: this.joins,
      startedAt: this.startedAt,
    };
  }

  reset(): void {
    this.hits = this.misses = this.upstreamCalls = this.upstreamErrors = 0;
    this.rateLimited = this.stale = this.joins = 0;
  }
}
