import { Body, Controller, Get, HttpCode, Inject, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SESSION_COOKIE, type AuthResponse } from '@fxpulse/shared';
import { CONFIG, type UserConfig } from '../config';
import { AuthGuard, CurrentUser } from './auth.guard';
import { AuthService, type SessionClaims } from './auth.service';
import { LoginDto, RegisterDto, ResetConfirmDto, ResetRequestDto } from './dto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(CONFIG) private readonly config: UserConfig,
  ) {}

  private setSession(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      maxAge: SEVEN_DAYS_MS,
      path: '/',
    });
  }

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, token } = await this.auth.register(dto.email, dto.password);
    this.setSession(res, token);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, token } = await this.auth.login(dto.email, dto.password);
    this.setSession(res, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  /** Dipakai frontend untuk mengetahui sesi saat ini (tambahan di luar FSD, tidak mengubah kontrak lain). */
  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: SessionClaims): Promise<AuthResponse> {
    return { user: await this.auth.me(user.sub) };
  }

  @Post('reset-request')
  @HttpCode(202)
  async resetRequest(@Body() dto: ResetRequestDto): Promise<{ ok: true }> {
    await this.auth.requestReset(dto.email);
    return { ok: true };
  }

  @Post('reset-confirm')
  @HttpCode(200)
  async resetConfirm(@Body() dto: ResetConfirmDto): Promise<{ ok: true }> {
    await this.auth.confirmReset(dto.token, dto.password);
    return { ok: true };
  }
}
