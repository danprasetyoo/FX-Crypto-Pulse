import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  normalizeEmail,
  verifyPassword,
} from './password';

describe('password util', () => {
  it('hash bcrypt bisa diverifikasi dan tidak menyimpan teks biasa', async () => {
    const hash = await hashPassword('rahasia123', 4);
    expect(hash).not.toContain('rahasia123');
    expect(await verifyPassword('rahasia123', hash)).toBe(true);
    expect(await verifyPassword('salah', hash)).toBe(false);
  });

  it('token reset: hash deterministik, token acak', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashResetToken(a.token));
    expect(a.token).toHaveLength(64);
  });

  it('email dinormalisasi ke huruf kecil', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});
