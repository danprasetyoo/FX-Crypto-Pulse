import { AuthService } from './auth.service';
import { loadConfig } from '../config';
import type { UsersRepository, UserRow } from '../users/users.repository';
import type { MailService } from '../mail/mail.service';
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidTokenError,
  UnauthorizedError,
} from '../common/errors';
import { hashPassword, hashResetToken } from './password';

function makeRepo(): jest.Mocked<UsersRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
    createResetToken: jest.fn(),
    consumeResetToken: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
}

const config = loadConfig({
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  BCRYPT_ROUNDS: '4',
  APP_BASE_URL: 'http://app.test',
});

describe('AuthService', () => {
  let repo: jest.Mocked<UsersRepository>;
  let mail: { send: jest.Mock };
  let svc: AuthService;

  beforeEach(() => {
    repo = makeRepo();
    mail = { send: jest.fn(async () => undefined) };
    svc = new AuthService(repo, mail as unknown as MailService, config);
  });

  it('register menormalisasi email, menyimpan hash, dan mengembalikan token sesi', async () => {
    repo.create.mockImplementation(async (email, hash) => ({
      id: 'u1',
      email,
      password_hash: hash,
      created_at: new Date(),
    }));
    const r = await svc.register('  Foo@Bar.COM ', 'password123');
    expect(repo.create).toHaveBeenCalledWith(
      'foo@bar.com',
      expect.not.stringContaining('password123'),
    );
    expect(r.user.email).toBe('foo@bar.com');
    expect(svc.verify(r.token)).toEqual({ sub: 'u1', email: 'foo@bar.com' });
  });

  it('register email ganda -> EmailTakenError', async () => {
    repo.create.mockResolvedValue(null);
    await expect(svc.register('a@b.c', 'password123')).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('login benar mengembalikan token, salah -> InvalidCredentialsError', async () => {
    const row: UserRow = {
      id: 'u1',
      email: 'a@b.c',
      password_hash: await hashPassword('password123', 4),
      created_at: new Date(),
    };
    repo.findByEmail.mockResolvedValue(row);
    await expect(svc.login('A@b.c', 'password123')).resolves.toMatchObject({ user: { id: 'u1' } });
    await expect(svc.login('a@b.c', 'salah')).rejects.toBeInstanceOf(InvalidCredentialsError);
    repo.findByEmail.mockResolvedValue(null);
    await expect(svc.login('x@y.z', 'password123')).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('verify menolak token rusak', () => {
    expect(() => svc.verify('abc')).toThrow(UnauthorizedError);
  });

  it('requestReset mengirim email berisi tautan token hanya untuk email terdaftar', async () => {
    repo.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      password_hash: 'x',
      created_at: new Date(),
    });
    await svc.requestReset('a@b.c');
    expect(repo.createResetToken).toHaveBeenCalledTimes(1);
    const [, storedHash] = repo.createResetToken.mock.calls[0];
    const link = /http:\/\/app\.test\/reset\?token=([0-9a-f]{64})/.exec(
      mail.send.mock.calls[0][0].text,
    );
    expect(link).not.toBeNull();
    expect(hashResetToken(link![1])).toBe(storedHash);

    repo.findByEmail.mockResolvedValue(null);
    await svc.requestReset('nobody@b.c');
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('confirmReset memakai token sekali pakai', async () => {
    repo.consumeResetToken.mockResolvedValueOnce('u1').mockResolvedValueOnce(null);
    await svc.confirmReset('a'.repeat(64), 'passwordbaru');
    expect(repo.updatePassword).toHaveBeenCalledWith('u1', expect.any(String));
    await expect(svc.confirmReset('a'.repeat(64), 'passwordbaru')).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });
});
