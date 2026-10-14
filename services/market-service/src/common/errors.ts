import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@fxpulse/shared';

/**
 * Semua error yang dikirim ke klien berbentuk ApiError (lihat packages/shared).
 * Pesan untuk pengguna tidak menyebut nama API eksternal atau kode teknis (Design System bagian 7).
 */
export class ApiHttpException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    const body: ApiError = { statusCode: status, code, message, details };
    super(body, status);
  }
}

export class BadRequestError extends ApiHttpException {
  constructor(message: string, details?: unknown, code = 'BAD_REQUEST') {
    super(HttpStatus.BAD_REQUEST, code, message, details);
  }
}

export class UnsupportedCurrencyError extends ApiHttpException {
  constructor(unsupported: string[], supported: string[]) {
    super(
      HttpStatus.BAD_REQUEST,
      'UNSUPPORTED_CURRENCY',
      `Mata uang tidak didukung: ${unsupported.join(', ')}.`,
      { unsupported, supported },
    );
  }
}

/** Cache kosong dan upstream gagal: "data belum tersedia, coba lagi nanti". */
export class DataUnavailableError extends ApiHttpException {
  constructor() {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      'DATA_UNAVAILABLE',
      'Data belum tersedia. Coba lagi beberapa saat.',
    );
  }
}

// ---- Error internal dari lapisan upstream (tidak langsung ke klien) ----

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export class UpstreamRateLimitedError extends UpstreamError {
  constructor(public readonly retryAfterSec?: number) {
    super('Upstream rate limited (429)', false, 429);
    this.name = 'UpstreamRateLimitedError';
  }
}

export class UpstreamTimeoutError extends UpstreamError {
  constructor(timeoutMs: number) {
    super(`Upstream timeout after ${timeoutMs}ms`, true);
    this.name = 'UpstreamTimeoutError';
  }
}
