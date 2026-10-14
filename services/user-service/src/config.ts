export interface UserConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  /** Format durasi jsonwebtoken, default 7d (FSD bagian 2). */
  jwtExpiresIn: string;
  cookieSecure: boolean;
  appBaseUrl: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
  };
  bcryptRounds: number;
  logLevel: string;
  nodeEnv: string;
}

function num(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} harus angka, dapat "${raw}"`);
  return n;
}

function bool(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): UserConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const jwtSecret = env.JWT_SECRET ?? '';
  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET wajib minimal 32 karakter di produksi.');
  }
  return {
    port: num(env, 'PORT', 3002),
    databaseUrl: env.DATABASE_URL ?? 'postgres://fxpulse:fxpulse@localhost:5432/fxpulse',
    jwtSecret: jwtSecret || 'dev-only-secret-do-not-use-in-production',
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '7d',
    cookieSecure: bool(env, 'COOKIE_SECURE', false),
    appBaseUrl: (env.APP_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
    smtp: {
      host: env.SMTP_HOST ?? 'localhost',
      port: num(env, 'SMTP_PORT', 1025),
      secure: bool(env, 'SMTP_SECURE', false),
      user: env.SMTP_USER || undefined,
      pass: env.SMTP_PASS || undefined,
      from: env.MAIL_FROM ?? 'FX & Crypto Pulse <no-reply@fxpulse.local>',
    },
    bcryptRounds: num(env, 'BCRYPT_ROUNDS', 10),
    logLevel: env.LOG_LEVEL ?? 'info',
    nodeEnv,
  };
}

export const CONFIG = Symbol('USER_CONFIG');
