import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type MarketConfig } from '../config';
import { UpstreamError, UpstreamRateLimitedError, UpstreamTimeoutError } from '../common/errors';

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  /** Fungsi tidur, bisa diganti di unit test. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Klien HTTP ke API eksternal dengan aturan FSD bagian 8:
 * - Timeout per request (default 5 dtk).
 * - Timeout/5xx/jaringan: retry maksimal 2x dengan backoff eksponensial (300ms, 600ms).
 * - 429: TIDAK di-retry; dilempar sebagai UpstreamRateLimitedError agar cache menunda.
 * - 4xx lain: tidak di-retry.
 */
@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  constructor(@Inject(CONFIG) private readonly config: MarketConfig) {}

  async getJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? this.config.upstreamTimeoutMs;
    const maxRetries = opts.maxRetries ?? this.config.upstreamMaxRetries;
    const sleep = opts.sleep ?? defaultSleep;

    let lastError: UpstreamError | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = 300 * 2 ** (attempt - 1);
        this.logger.warn(
          `Retry ${attempt}/${maxRetries} ${url} setelah ${backoff}ms: ${lastError?.message}`,
        );
        await sleep(backoff);
      }
      try {
        return await this.once<T>(url, timeoutMs, opts.headers);
      } catch (err) {
        if (err instanceof UpstreamError && err.retryable) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError ?? new UpstreamError('Upstream failed', true);
  }

  private async once<T>(
    url: string,
    timeoutMs: number,
    headers?: Record<string, string>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      if (res.status === 429) {
        const ra = Number(res.headers.get('retry-after'));
        throw new UpstreamRateLimitedError(Number.isFinite(ra) && ra > 0 ? ra : undefined);
      }
      if (res.status >= 500) {
        throw new UpstreamError(`Upstream ${res.status} for ${url}`, true, res.status);
      }
      if (!res.ok) {
        throw new UpstreamError(`Upstream ${res.status} for ${url}`, false, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      if ((err as Error)?.name === 'AbortError') throw new UpstreamTimeoutError(timeoutMs);
      throw new UpstreamError(`Network error for ${url}: ${(err as Error)?.message ?? err}`, true);
    } finally {
      clearTimeout(timer);
    }
  }
}
