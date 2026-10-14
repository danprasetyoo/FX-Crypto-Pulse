import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

/** Hash password dengan bcrypt (FSD bagian 2). Password tidak pernah disimpan sebagai teks biasa. */
export async function hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Token reset acak (hex 64 karakter); yang disimpan hanya hash SHA-256-nya. */
export function generateResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
