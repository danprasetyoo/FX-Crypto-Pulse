import { createServer } from 'node:http';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { PgAlertsRepo } from './alerts.repo';
import { loadConfig } from './config';
import { runCycle, type CycleSummary, type Logger } from './job';
import { SmtpMailer } from './mailer';
import { MarketServicePriceSource } from './prices';

const QUEUE_NAME = 'alerts';
const JOB_NAME = 'evaluate-alerts';

const log: Logger = {
  info: (m) => console.info(`[worker] ${new Date().toISOString()} ${m}`),
  warn: (m) => console.warn(`[worker] ${new Date().toISOString()} WARN ${m}`),
  error: (m) => console.error(`[worker] ${new Date().toISOString()} ERROR ${m}`),
};

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl, max: 5 });
  const repo = new PgAlertsRepo(pool);
  const prices = new MarketServicePriceSource(config.marketServiceUrl);
  const mailer = new SmtpMailer(config);

  // Serialisasi siklus: jadwal BullMQ dan pemicu admin tidak boleh tumpang tindih.
  let chain: Promise<unknown> = Promise.resolve();
  let lastSummary: CycleSummary | null = null;
  const runSerialized = (): Promise<CycleSummary> => {
    const next = chain.then(() => runCycle(repo, prices, mailer, log));
    chain = next.catch(() => undefined);
    return next.then((s) => {
      lastSummary = s;
      log.info(
        `Siklus selesai: evaluasi=${s.evaluated} cocok=${s.matched} terkirim=${s.sent} gagal=${s.failed}`,
      );
      return s;
    });
  };

  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  connection.on('error', (err) => log.warn(`redis: ${err.message}`));

  const queue = new Queue(QUEUE_NAME, { connection });
  // Satu penjadwal berulang dengan id tetap: aman dipanggil ulang saat restart.
  await queue.upsertJobScheduler(
    JOB_NAME,
    { every: config.intervalMs },
    { name: JOB_NAME, opts: { removeOnComplete: 20, removeOnFail: 50 } },
  );
  log.info(`Penjadwal '${JOB_NAME}' tiap ${config.intervalMs / 1000} dtk terdaftar.`);

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      await runSerialized();
    },
    { connection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => log.error(`Job ${job?.id} gagal: ${err.message}`));

  if (config.runOnStart) {
    runSerialized().catch((err) => log.error(`Siklus awal gagal: ${(err as Error).message}`));
  }

  // HTTP kecil untuk healthcheck dan (opsional) pemicu manual untuk e2e.
  const server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && req.url === '/health') {
      const [redis, db] = await Promise.all([
        connection
          .ping()
          .then((p) => p === 'PONG')
          .catch(() => false),
        pool
          .query('SELECT 1')
          .then(() => true)
          .catch(() => false),
      ]);
      return send(redis && db ? 200 : 503, {
        status: redis && db ? 'ok' : 'degraded',
        service: 'alert-worker',
        redis,
        db,
        lastSummary,
      });
    }
    if (req.method === 'POST' && req.url === '/run') {
      if (!config.adminEnabled) return send(404, { code: 'NOT_FOUND', message: 'Not found' });
      try {
        return send(200, await runSerialized());
      } catch (err) {
        return send(500, { code: 'CYCLE_FAILED', message: (err as Error).message });
      }
    }
    send(404, { code: 'NOT_FOUND', message: 'Not found' });
  });
  server.listen(config.adminPort, '0.0.0.0', () =>
    log.info(`HTTP health di :${config.adminPort} (admin=${config.adminEnabled})`),
  );

  const shutdown = async (signal: string) => {
    log.info(`Menerima ${signal}, berhenti...`);
    server.close();
    await worker.close().catch(() => undefined);
    await queue.close().catch(() => undefined);
    await connection.quit().catch(() => undefined);
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('alert-worker gagal start', err);
  process.exit(1);
});
