#!/usr/bin/env node
/**
 * Menjalankan seluruh stack TANPA Docker (untuk mesin dev yang belum punya Docker,
 * misalnya WSL tanpa integrasi Docker Desktop). Dipakai juga sebagai target e2e lokal.
 *
 * Komponen:
 *   - PostgreSQL : paket npm `embedded-postgres` (binari diunduh otomatis saat install)
 *   - Redis      : binari `valkey-server`/`redis-server` di PATH atau env LOCAL_REDIS_BIN
 *   - Mailpit    : diunduh otomatis ke .local-stack/bin dari GitHub releases
 *   - mock-upstream, market-service, user-service, alert-worker : node dist/main.js
 *   - gateway    : `vite preview` dengan proxy yang meniru routing nginx
 *
 * Pemakaian:
 *   npm run build
 *   npm i -D embedded-postgres        # sekali saja (tidak dimasukkan ke devDependencies repo)
 *   node scripts/local-stack.mjs      # Ctrl+C untuk berhenti
 *
 * Env opsional: LOCAL_REDIS_BIN, LOCAL_STACK_MODULES (dir node_modules alternatif),
 *               GATEWAY_PORT (8080), MAILPIT_UI_PORT (8025), LOCAL_PG_PORT (5440), LOCAL_REDIS_PORT (6390)
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Postgres menolak data dir dengan permission longgar; drive Windows di WSL (/mnt/*)
// tidak mendukung chmod 0700, jadi di situ data disimpan di home pengguna.
const stackDir =
  process.env.LOCAL_STACK_DIR ??
  (root.startsWith('/mnt/') ? join(homedir(), '.fxpulse-local-stack') : join(root, '.local-stack'));
const binDir = join(stackDir, 'bin');
mkdirSync(binDir, { recursive: true });

const PG_PORT = Number(process.env.LOCAL_PG_PORT ?? 5440);
const REDIS_PORT = Number(process.env.LOCAL_REDIS_PORT ?? 6390);
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 8080);
const MAILPIT_UI_PORT = Number(process.env.MAILPIT_UI_PORT ?? 8025);
const MAILPIT_SMTP_PORT = Number(process.env.MAILPIT_SMTP_PORT ?? 1025);
const MOCK_PORT = 4000;
const MARKET_PORT = 3001;
const USER_PORT = 3002;
const WORKER_PORT = 3003;

const children = [];
const log = (name, msg) => console.log(`[local-stack] ${name}: ${msg}`);

function run(name, cmd, args, env = {}, cwd = root) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => log(name, `exit ${code}`));
  children.push(child);
  return child;
}

async function waitHttp(name, url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        log(name, `siap (${url})`);
        return;
      }
    } catch {
      /* belum siap */
    }
    await sleep(500);
  }
  throw new Error(`${name} tidak siap dalam ${timeoutMs}ms (${url})`);
}

function which(bin) {
  try {
    return execSync(`command -v ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

async function ensureMailpit() {
  const target = join(binDir, 'mailpit');
  if (existsSync(target)) return target;
  const found = which('mailpit');
  if (found) return found;
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  const url = `https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-${arch}.tar.gz`;
  log('mailpit', `mengunduh ${url}`);
  execSync(`curl -sSL "${url}" | tar xz -C "${binDir}" mailpit`, { stdio: 'inherit' });
  chmodSync(target, 0o755);
  return target;
}

async function startPostgres() {
  const require = createRequire(
    join(process.env.LOCAL_STACK_MODULES ?? join(root, 'node_modules'), 'x.js'),
  );
  let EmbeddedPostgres;
  try {
    EmbeddedPostgres = require('embedded-postgres').default ?? require('embedded-postgres');
  } catch {
    throw new Error(
      'Paket embedded-postgres belum terpasang. Jalankan: npm i -D embedded-postgres (atau set LOCAL_STACK_MODULES).',
    );
  }
  const pg = new EmbeddedPostgres({
    databaseDir: join(stackDir, 'pg'),
    user: 'fxpulse',
    password: 'fxpulse',
    port: PG_PORT,
    persistent: false,
    onLog: () => undefined,
    onError: (m) => process.stderr.write(`[postgres] ${m}`),
  });
  if (!existsSync(join(stackDir, 'pg', 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase('fxpulse');
  } catch {
    /* sudah ada */
  }
  log('postgres', `siap di :${PG_PORT}`);
  return pg;
}

async function main() {
  const redisBin = process.env.LOCAL_REDIS_BIN ?? which('valkey-server') ?? which('redis-server');
  if (!redisBin)
    throw new Error('valkey-server/redis-server tidak ditemukan. Set LOCAL_REDIS_BIN.');
  const mailpitBin = await ensureMailpit();

  const pg = await startPostgres();
  run('redis', redisBin, [
    '--port',
    String(REDIS_PORT),
    '--save',
    '',
    '--appendonly',
    'no',
    '--loglevel',
    'warning',
  ]);
  run('mailpit', mailpitBin, [
    '--listen',
    `127.0.0.1:${MAILPIT_UI_PORT}`,
    '--smtp',
    `127.0.0.1:${MAILPIT_SMTP_PORT}`,
    '--quiet',
  ]);
  await waitHttp('mailpit', `http://127.0.0.1:${MAILPIT_UI_PORT}/livez`);

  const svc = (name) => join(root, 'services', name);
  run('mock-upstream', 'node', ['dist/main.js'], { PORT: String(MOCK_PORT) }, svc('mock-upstream'));
  await waitHttp('mock-upstream', `http://127.0.0.1:${MOCK_PORT}/health`);

  const common = {
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    REDIS_URL: `redis://127.0.0.1:${REDIS_PORT}`,
    DATABASE_URL: `postgres://fxpulse:fxpulse@127.0.0.1:${PG_PORT}/fxpulse`,
    APP_BASE_URL: `http://localhost:${GATEWAY_PORT}`,
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(MAILPIT_SMTP_PORT),
    SMTP_SECURE: 'false',
  };

  run(
    'market-service',
    'node',
    ['dist/main.js'],
    {
      ...common,
      PORT: String(MARKET_PORT),
      FRANKFURTER_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
      COINGECKO_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/api/v3`,
      MARKET_ADMIN_ENABLED: 'true',
      UPSTREAM_TIMEOUT_MS: '2000',
    },
    svc('market-service'),
  );
  run(
    'user-service',
    'node',
    ['dist/main.js'],
    {
      ...common,
      PORT: String(USER_PORT),
      JWT_SECRET: 'local-stack-secret-local-stack-secret-123',
      BCRYPT_ROUNDS: '4',
    },
    svc('user-service'),
  );
  await waitHttp('market-service', `http://127.0.0.1:${MARKET_PORT}/api/health`);
  await waitHttp('user-service', `http://127.0.0.1:${USER_PORT}/api/health`);

  run(
    'alert-worker',
    'node',
    ['dist/main.js'],
    {
      ...common,
      PORT: String(WORKER_PORT),
      MARKET_SERVICE_URL: `http://127.0.0.1:${MARKET_PORT}`,
      WORKER_ADMIN_ENABLED: 'true',
      ALERT_INTERVAL_MS: '60000',
      ALERT_RUN_ON_START: 'true',
    },
    svc('alert-worker'),
  );
  await waitHttp('alert-worker', `http://127.0.0.1:${WORKER_PORT}/health`);

  run(
    'gateway',
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1'],
    {
      GATEWAY_PORT: String(GATEWAY_PORT),
      MARKET_SERVICE_URL: `http://127.0.0.1:${MARKET_PORT}`,
      USER_SERVICE_URL: `http://127.0.0.1:${USER_PORT}`,
    },
    join(root, 'apps', 'web'),
  );
  await waitHttp('gateway', `http://127.0.0.1:${GATEWAY_PORT}/api/health/market`);

  console.log(`
[local-stack] Semua siap.
  Aplikasi   : http://localhost:${GATEWAY_PORT}
  Mailpit UI : http://localhost:${MAILPIT_UI_PORT}
  Mock       : http://localhost:${MOCK_PORT}/__control/stats
  Worker     : http://localhost:${WORKER_PORT}/health
Jalankan e2e di terminal lain: npm run e2e
Tekan Ctrl+C untuk berhenti.
`);

  const shutdown = async () => {
    log('stack', 'berhenti...');
    for (const c of children) c.kill('SIGTERM');
    await sleep(1000);
    for (const c of children) if (c.exitCode === null) c.kill('SIGKILL');
    await pg.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[local-stack] gagal:', err.message);
  for (const c of children) c.kill('SIGKILL');
  process.exit(1);
});
