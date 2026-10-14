// Uji beban k6 (PRD metrik sukses): 50 pengguna simultan selama 10 menit,
// cache hit ratio >= 90%, tanpa 429 dari upstream.
//
//   k6 run -e BASE_URL=http://localhost:8080 load/k6/dashboard.js
//   (durasi pendek untuk smoke: -e DURATION=1m -e VUS=10)
//
// Setelah selesai, cek GET /api/market/metrics: cacheHitRatio dan upstreamRateLimited.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const staleRate = new Trend('stale_responses');

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '10m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const pages = [
  '/api/fx/latest?base=IDR&quotes=USD,EUR,SGD,JPY,GBP,AUD,CNY',
  '/api/crypto/top?vs=idr,usd',
  '/api/crypto/history?id=bitcoin&vs=idr&range=90',
  '/api/fx/history?pair=USD-IDR&range=30',
  '/api/convert?from=USD&to=IDR&amount=100',
];

export default function () {
  for (const path of pages) {
    const res = http.get(`${BASE_URL}${path}`);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'punya updatedAt': (r) => r.json('updatedAt') !== undefined,
    });
    if (ok) staleRate.add(res.json('stale') ? 1 : 0);
  }
  sleep(1);
}

export function handleSummary(data) {
  const metrics = http.get(`${BASE_URL}/api/market/metrics`).json();
  const line = `cacheHitRatio=${(metrics.cacheHitRatio * 100).toFixed(1)}% upstreamRateLimited=${metrics.upstreamRateLimited} upstreamCalls=${metrics.upstreamCalls}`;
  const pass = metrics.cacheHitRatio >= 0.9 && metrics.upstreamRateLimited === 0;
  return {
    stdout: `\n== Metrik market-service ==\n${line}\nGerbang PRD (hit >= 90%, 429 = 0): ${pass ? 'LULUS' : 'GAGAL'}\n`,
    'load/results/summary.json': JSON.stringify(
      { k6: data.metrics, market: metrics, pass },
      null,
      2,
    ),
  };
}
