export interface WorkerConfig {
  redisUrl: string;
  databaseUrl: string;
  marketServiceUrl: string;
  intervalMs: number;
  runOnStart: boolean;
  adminEnabled: boolean;
  adminPort: number;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
  };
  appBaseUrl: string;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return {
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    databaseUrl: env.DATABASE_URL ?? 'postgres://fxpulse:fxpulse@localhost:5432/fxpulse',
    marketServiceUrl: (env.MARKET_SERVICE_URL ?? 'http://localhost:3001').replace(/\/$/, ''),
    intervalMs: num(env, 'ALERT_INTERVAL_MS', 5 * 60 * 1000),
    runOnStart: bool(env, 'ALERT_RUN_ON_START', true),
    adminEnabled: bool(env, 'WORKER_ADMIN_ENABLED', false),
    adminPort: num(env, 'PORT', 3003),
    smtp: {
      host: env.SMTP_HOST ?? 'localhost',
      port: num(env, 'SMTP_PORT', 1025),
      secure: bool(env, 'SMTP_SECURE', false),
      user: env.SMTP_USER || undefined,
      pass: env.SMTP_PASS || undefined,
      from: env.MAIL_FROM ?? 'FX & Crypto Pulse <no-reply@fxpulse.local>',
    },
    appBaseUrl: (env.APP_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
  };
}
