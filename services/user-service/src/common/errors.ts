import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@fxpulse/shared';

export class ApiHttpException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    const body: ApiError = { statusCode: status, code, message, details };
    super(body, status);
  }
}

export class ValidationError extends ApiHttpException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends ApiHttpException {
  constructor(message = 'Silakan masuk untuk melanjutkan.') {
    super(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }
}

export class InvalidCredentialsError extends ApiHttpException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email atau password salah.');
  }
}

export class EmailTakenError extends ApiHttpException {
  constructor() {
    super(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'Email sudah terdaftar.');
  }
}

export class NotFoundError extends ApiHttpException {
  constructor(message = 'Data tidak ditemukan.') {
    super(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }
}

export class ConflictError extends ApiHttpException {
  constructor(message: string, code = 'CONFLICT') {
    super(HttpStatus.CONFLICT, code, message);
  }
}

export class InvalidTokenError extends ApiHttpException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      'INVALID_TOKEN',
      'Tautan reset tidak valid atau sudah kedaluwarsa.',
    );
  }
}
