import { describe, expect, it, vi } from 'vitest';
import { runCycle } from './job';
import type { ActiveAlert, AlertsRepo } from './alerts.repo';
import type { PriceSource } from './prices';
import type { Mailer } from './mailer';

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const btcBelow: ActiveAlert = {
  id: 'a1',
  userId: 'u1',
  email: 'u1@test.local',
  type: 'crypto',
  assetCode: 'bitcoin',
  condition: 'below',
  target: 900_000_000,
  currency: 'IDR',
  activation: 1,
};
const usdAbove: ActiveAlert = {
  ...btcBelow,
  id: 'a2',
  type: 'fx',
  assetCode: 'USD',
  condition: 'above',
  target: 16000,
  currency: 'IDR',
};

function prices(map: Record<string, number>, stale = false): PriceSource {
  return {
    fetch: vi.fn(async () => ({
      prices: new Map(Object.entries(map)),
      stale,
      updatedAt: '2026-10-10T07:00:00.000Z',
    })),
  };
}

describe('runCycle', () => {
  it('mengirim email lalu menandai terpicu untuk alert yang terpenuhi', async () => {
    const repo: AlertsRepo = {
      loadActive: vi.fn(async () => [btcBelow, usdAbove]),
      markTriggered: vi.fn(async () => true),
    };
    const mailer: Mailer = { sendAlert: vi.fn(async () => undefined) };
    const s = await runCycle(
      repo,
      prices({ 'crypto:bitcoin:IDR': 850_000_000, 'fx:USD:IDR': 15900 }),
      mailer,
      log,
    );
    expect(s).toMatchObject({ evaluated: 2, matched: 1, sent: 1, failed: 0 });
    expect(mailer.sendAlert).toHaveBeenCalledTimes(1);
    expect(repo.markTriggered).toHaveBeenCalledWith(btcBelow, 850_000_000);
  });

  it('email gagal: alert tidak ditandai dan dicoba lagi siklus berikutnya', async () => {
    const repo: AlertsRepo = {
      loadActive: vi.fn(async () => [btcBelow]),
      markTriggered: vi.fn(async () => true),
    };
    const mailer: Mailer = {
      sendAlert: vi.fn(async () => {
        throw new Error('smtp down');
      }),
    };
    const s = await runCycle(repo, prices({ 'crypto:bitcoin:IDR': 1 }), mailer, log);
    expect(s).toMatchObject({ matched: 1, sent: 0, failed: 1 });
    expect(repo.markTriggered).not.toHaveBeenCalled();
  });

  it('alert tanpa harga dilewati, tidak ada panggilan harga jika tidak ada alert', async () => {
    const repo: AlertsRepo = {
      loadActive: vi.fn(async () => [btcBelow]),
      markTriggered: vi.fn(async () => true),
    };
    const mailer: Mailer = { sendAlert: vi.fn(async () => undefined) };
    const s = await runCycle(repo, prices({}), mailer, log);
    expect(s.skippedNoPrice).toBe(1);
    expect(mailer.sendAlert).not.toHaveBeenCalled();

    const src = prices({});
    const empty: AlertsRepo = {
      loadActive: vi.fn(async () => []),
      markTriggered: vi.fn(async () => true),
    };
    await runCycle(empty, src, mailer, log);
    expect(src.fetch).not.toHaveBeenCalled();
  });

  it('markTriggered false (sudah tidak aktif) tidak dihitung terkirim', async () => {
    const repo: AlertsRepo = {
      loadActive: vi.fn(async () => [btcBelow]),
      markTriggered: vi.fn(async () => false),
    };
    const mailer: Mailer = { sendAlert: vi.fn(async () => undefined) };
    const s = await runCycle(repo, prices({ 'crypto:bitcoin:IDR': 1 }), mailer, log);
    expect(s.sent).toBe(0);
  });
});
