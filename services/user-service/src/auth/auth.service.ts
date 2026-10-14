import { Inject, Injectable, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { UserPublic } from '@fxpulse/shared';
import { CONFIG, type UserConfig } from '../config';
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidTokenError,
  UnauthorizedError,
} from '../common/errors';
import { MailService } from '../mail/mail.service';
import { UsersRepository, type UserRow } from '../users/users.repository';
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  normalizeEmail,
  verifyPassword,
} from './password';

export interface SessionClaims {
  sub: string;
  email: string;
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function toPublic(u: UserRow): UserPublic {
  return { id: u.id, email: u.email, createdAt: new Date(u.created_at).toISOString() };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly mail: MailService,
    @Inject(CONFIG) private readonly config: UserConfig,
  ) {}

  async register(emailRaw: string, password: string): Promise<{ user: UserPublic; token: string }> {
    const email = normalizeEmail(emailRaw);
    const hash = await hashPassword(password, this.config.bcryptRounds);
    const row = await this.users.create(email, hash);
    if (!row) throw new EmailTakenError();
    return { user: toPublic(row), token: this.sign(row) };
  }

  async login(emailRaw: string, password: string): Promise<{ user: UserPublic; token: string }> {
    const email = normalizeEmail(emailRaw);
    const row = await this.users.findByEmail(email);
    // Verifikasi tetap dijalankan dengan hash dummy agar waktu respons mirip (mencegah enumerasi).
    const ok = row
      ? await verifyPassword(password, row.password_hash)
      : await verifyPassword(password, DUMMY_HASH).then(() => false);
    if (!row || !ok) throw new InvalidCredentialsError();
    return { user: toPublic(row), token: this.sign(row) };
  }

  sign(user: Pick<UserRow, 'id' | 'email'>): string {
    const claims: SessionClaims = { sub: user.id, email: user.email };
    return jwt.sign(claims, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): SessionClaims {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.email !== 'string') throw new Error('claims');
      return { sub: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedError('Sesi tidak valid atau sudah berakhir.');
    }
  }

  async me(userId: string): Promise<UserPublic> {
    const row = await this.users.findById(userId);
    if (!row) throw new UnauthorizedError();
    return toPublic(row);
  }

  /**
   * Selalu "berhasil" agar tidak membocorkan email mana yang terdaftar.
   * Email berisi tautan ke halaman reset di frontend dengan token sekali pakai (1 jam).
   */
  async requestReset(emailRaw: string): Promise<void> {
    const email = normalizeEmail(emailRaw);
    const row = await this.users.findByEmail(email);
    if (!row) {
      this.logger.log(`Reset diminta untuk email tidak terdaftar (diabaikan).`);
      return;
    }
    const { token, hash } = generateResetToken();
    await this.users.createResetToken(row.id, hash, new Date(Date.now() + RESET_TOKEN_TTL_MS));
    const link = `${this.config.appBaseUrl}/reset?token=${token}`;
    await this.mail.send({
      to: row.email,
      subject: 'Reset password FX & Crypto Pulse',
      text: `Kami menerima permintaan reset password.\n\nBuka tautan berikut dalam 1 jam untuk mengganti password:\n${link}\n\nJika Anda tidak meminta ini, abaikan email ini.`,
      html: `<p>Kami menerima permintaan reset password.</p><p>Buka tautan berikut dalam 1 jam untuk mengganti password:</p><p><a href="${link}">${link}</a></p><p>Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    });
  }

  async confirmReset(token: string, password: string): Promise<void> {
    const userId = await this.users.consumeResetToken(hashResetToken(token));
    if (!userId) throw new InvalidTokenError();
    await this.users.updatePassword(userId, await hashPassword(password, this.config.bcryptRounds));
  }
}

/** Hash bcrypt dari string acak, hanya untuk menyamakan waktu respons login. */
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8sWf7y2Q2Y7l7VY2b4S3Zy2u1y2qkC';
