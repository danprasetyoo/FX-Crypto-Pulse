import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DbService) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const r = await this.db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const r = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] ?? null;
  }

  /** Mengembalikan null jika email sudah ada (unique violation). */
  async create(email: string, passwordHash: string): Promise<UserRow | null> {
    const r = await this.db.query<UserRow>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email, passwordHash],
    );
    return r.rows[0] ?? null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
      userId,
      passwordHash,
    ]);
  }

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    );
  }

  /** Menandai token terpakai dan mengembalikan user_id, atau null jika tidak valid/kedaluwarsa. */
  async consumeResetToken(tokenHash: string): Promise<string | null> {
    const r = await this.db.query<{ user_id: string }>(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [tokenHash],
    );
    return r.rows[0]?.user_id ?? null;
  }
}
