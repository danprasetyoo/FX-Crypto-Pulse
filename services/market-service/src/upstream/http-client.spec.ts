import { HttpClient } from './http-client';
import { loadConfig } from '../config';
import { UpstreamError, UpstreamRateLimitedError, UpstreamTimeoutError } from '../common/errors';

function mockFetchSequence(responses: Array<() => Promise<Response> | Response>) {
  let i = 0;
  const fn = jest.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return await r();
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('HttpClient', () => {
  const client = new HttpClient(
    loadConfig({ UPSTREAM_MAX_RETRIES: '2', UPSTREAM_TIMEOUT_MS: '50' }),
  );
  const noSleep = async () => {};

  it('mengembalikan JSON saat 200', async () => {
    mockFetchSequence([() => json({ ok: 1 })]);
    await expect(client.getJson('http://x', { sleep: noSleep })).resolves.toEqual({ ok: 1 });
  });

  it('retry dua kali untuk 5xx lalu berhasil', async () => {
    const fetchMock = mockFetchSequence([
      () => json({}, 502),
      () => json({}, 503),
      () => json({ ok: 2 }),
    ]);
    await expect(client.getJson('http://x', { sleep: noSleep })).resolves.toEqual({ ok: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('menyerah setelah retry habis', async () => {
    const fetchMock = mockFetchSequence([() => json({}, 500)]);
    await expect(client.getJson('http://x', { sleep: noSleep })).rejects.toBeInstanceOf(
      UpstreamError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('429 tidak di-retry dan dilempar sebagai rate limited', async () => {
    const fetchMock = mockFetchSequence([() => json({}, 429, { 'retry-after': '30' })]);
    const err = await client.getJson('http://x', { sleep: noSleep }).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamRateLimitedError);
    expect((err as UpstreamRateLimitedError).retryAfterSec).toBe(30);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('4xx lain tidak di-retry', async () => {
    const fetchMock = mockFetchSequence([() => json({}, 404)]);
    await expect(client.getJson('http://x', { sleep: noSleep })).rejects.toMatchObject({
      status: 404,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('timeout memicu retry dan akhirnya UpstreamTimeoutError', async () => {
    const fetchMock = mockFetchSequence([
      () =>
        new Promise<Response>((_, reject) => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          setTimeout(() => reject(e), 5);
        }),
    ]);
    await expect(
      client.getJson('http://x', { sleep: noSleep, timeoutMs: 1 }),
    ).rejects.toBeInstanceOf(UpstreamTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('backoff eksponensial 300ms lalu 600ms', async () => {
    mockFetchSequence([() => json({}, 500), () => json({}, 500), () => json({ ok: 3 })]);
    const sleeps: number[] = [];
    await client.getJson('http://x', {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(sleeps).toEqual([300, 600]);
  });
});
