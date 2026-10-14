import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE } from '@fxpulse/shared';
import { UnauthorizedError } from '../common/errors';
import { AuthService, type SessionClaims } from './auth.service';

export interface AuthedRequest extends Request {
  user?: SessionClaims;
}

export function extractToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies?.[SESSION_COOKIE]) return cookies[SESSION_COOKIE];
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** Memeriksa cookie sesi (atau header Bearer) dan menempelkan user ke request. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError();
    req.user = this.auth.verify(token);
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionClaims => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new UnauthorizedError();
    return req.user;
  },
);
