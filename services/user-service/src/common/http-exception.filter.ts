import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@fxpulse/shared';

/** Sama dengan market-service: semua error berbentuk ApiError, detail teknis hanya ke log. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<{ method: string; url: string }>();

    let body: ApiError;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null && 'code' in payload) {
        body = payload as ApiError;
      } else {
        const message =
          typeof payload === 'string'
            ? payload
            : ((payload as { message?: string | string[] }).message ?? exception.message);
        const msgs = Array.isArray(message) ? message : [String(message)];
        body = {
          statusCode: status,
          code:
            status === 400
              ? 'VALIDATION_ERROR'
              : status === 404
                ? 'NOT_FOUND'
                : status === 401
                  ? 'UNAUTHORIZED'
                  : 'HTTP_ERROR',
          message: msgs.join('; '),
          details: Array.isArray(message) ? { errors: message } : undefined,
        };
      }
    } else {
      this.logger.error(
        `Unhandled error on ${req.method} ${req.url}: ${(exception as Error)?.stack ?? exception}`,
      );
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.',
      };
    }
    res.status(body.statusCode).json(body);
  }
}
