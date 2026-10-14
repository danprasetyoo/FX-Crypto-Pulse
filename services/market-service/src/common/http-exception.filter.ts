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

/**
 * Menyeragamkan bentuk error menjadi ApiError dan menyembunyikan detail teknis
 * dari pengguna. Detail asli hanya masuk ke log.
 */
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
        body = {
          statusCode: status,
          code: status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR',
          message: Array.isArray(message) ? message.join('; ') : String(message),
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

    if (body.statusCode >= 500) {
      this.logger.warn(`${req.method} ${req.url} -> ${body.statusCode} ${body.code}`);
    }
    res.status(body.statusCode).json(body);
  }
}
