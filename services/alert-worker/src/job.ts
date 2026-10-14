import type { AlertsRepo } from './alerts.repo';
import { conditionMet } from './evaluate';
import type { Mailer } from './mailer';
import { priceKey, type PriceSource } from './prices';

export interface CycleSummary {
  evaluated: number;
  matched: number;
  sent: number;
  failed: number;
  skippedNoPrice: number;
  stale: boolean;
  startedAt: string;
  finishedAt: string;
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/**
 * Satu siklus evaluasi alert (FSD bagian 5 dan 7):
 * 1. Muat alert aktif.
 * 2. Ambil harga lewat market-service (cache).
 * 3. Untuk setiap alert yang terpenuhi: kirim email DULU, lalu dalam satu transaksi
 *    tandai terpicu + buat notifikasi. Jika email gagal, tidak ada yang ditandai
 *    dan alert dicoba lagi pada siklus berikutnya.
 */
export async function runCycle(
  repo: AlertsRepo,
  prices: PriceSource,
  mailer: Mailer,
  log: Logger,
): Promise<CycleSummary> {
  const startedAt = new Date().toISOString();
  const summary: CycleSummary = {
    evaluated: 0,
    matched: 0,
    sent: 0,
    failed: 0,
    skippedNoPrice: 0,
    stale: false,
    startedAt,
    finishedAt: startedAt,
  };

  const alerts = await repo.loadActive();
  summary.evaluated = alerts.length;
  if (alerts.length === 0) {
    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  const book = await prices.fetch(alerts);
  summary.stale = book.stale;
  if (book.stale)
    log.warn(`Harga dari cache stale (${book.updatedAt}); evaluasi tetap dijalankan.`);

  for (const alert of alerts) {
    const price = book.prices.get(priceKey(alert.type, alert.assetCode, alert.currency));
    if (price === undefined) {
      summary.skippedNoPrice++;
      log.warn(
        `Alert ${alert.id}: harga ${alert.type}:${alert.assetCode}:${alert.currency} tidak tersedia, dilewati.`,
      );
      continue;
    }
    if (!conditionMet(alert.condition, price, alert.target)) continue;
    summary.matched++;

    try {
      await mailer.sendAlert(alert, price, book.updatedAt);
    } catch (err) {
      summary.failed++;
      log.error(
        `Alert ${alert.id}: email gagal (${(err as Error).message}); tetap aktif untuk siklus berikutnya.`,
      );
      continue;
    }

    try {
      const marked = await repo.markTriggered(alert, price);
      if (marked) {
        summary.sent++;
        log.info(
          `Alert ${alert.id} terpicu pada harga ${price}; email terkirim ke ${alert.email}.`,
        );
      } else {
        log.warn(
          `Alert ${alert.id} sudah tidak aktif saat ditandai; kemungkinan dipicu proses lain.`,
        );
      }
    } catch (err) {
      // Email sudah terkirim tetapi penandaan gagal: risiko email ganda, diterima untuk MVP (FSD bagian 5).
      summary.failed++;
      log.error(
        `Alert ${alert.id}: email terkirim tetapi penandaan gagal (${(err as Error).message}).`,
      );
    }
  }

  summary.finishedAt = new Date().toISOString();
  return summary;
}
