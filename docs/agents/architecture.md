# Arsitektur

## Gambaran

```
Browser ──► gateway (nginx :8080) ──┬─► /api/fx, /api/crypto, /api/convert, /api/market ──► market-service :3001 ──► Redis ──► Frankfurter / CoinGecko
                                    ├─► /api/auth, /api/watchlist, /api/alerts            ──► user-service   :3002 ──► PostgreSQL ──► SMTP (reset password)
                                    └─► /                                                 ──► web (nginx statis)

alert-worker :3003 (BullMQ, tiap 5 menit) ──► market-service (/api/crypto/top, /api/fx/latest) + PostgreSQL ──► SMTP
```

Prinsip (FSD bagian 4): frontend hanya memanggil backend; backend membaca cache Redis dan hanya
memanggil API eksternal saat cache kosong; worker memakai cache yang sama lewat market-service.

## Layanan

### market-service (NestJS)

- `upstream/http-client.ts`: `fetch` dengan timeout (default 5 dtk), retry 2x backoff eksponensial
  (300 ms, 600 ms) untuk timeout/5xx/jaringan. **429 tidak di-retry** dan dilempar sebagai
  `UpstreamRateLimitedError`.
- `cache/cache.service.ts`: `getOrFetch(key, ttl, fetcher)`.
  - Kunci `fresh:<key>` (TTL sesuai tabel FSD) dan `last:<key>` (7 hari) untuk fallback.
  - Single-flight in-process: permintaan bersamaan untuk kunci sama digabung.
  - Upstream gagal → sajikan `last:` dengan `stale: true`. Tidak ada salinan → `503 DATA_UNAVAILABLE`.
  - 429 → set `cooldown:<key>` selama max(TTL, Retry-After); selama cooldown upstream tidak dipanggil.
  - Store: `RedisCacheStore` (produksi) atau `MemoryCacheStore` (`REDIS_URL=memory`, unit test).
- `cache/metrics.service.ts`: hit/miss/429/stale di memori proses; `GET /api/market/metrics`.
- `fx/`: Frankfurter selalu dipanggil dengan `base=EUR` (presisi penuh), kurs silang dihitung
  lokal: `quote/base = r[base] / r[quote]`. `latest` memakai time series 14 hari untuk mendapat
  dua hari kerja ECB (perubahan harian). Mata uang divalidasi terhadap `/currencies` (cache 24 jam).
- `crypto/`: `/coins/markets` satu request per mata uang kuotasi (idr, usd), cache 60 dtk.
  `market_chart` di-downsample menjadi satu titik per hari UTC, cache 1 jam.
- `convert/`: semua aset dinilai dalam IDR dari cache (FX latest + top-20 kripto), lalu
  `hasil = amount * idr(from) / idr(to)`. Envelope gabungan memakai `updatedAt` paling lama dan
  `stale` jika salah satu stale.
- Admin (hanya `MARKET_ADMIN_ENABLED=true`): `POST /api/market/cache/flush` (hapus `fresh:`),
  `POST /api/market/cache/flush-all` (semua + reset metrik).

### user-service (NestJS)

- `db/`: pool `pg`, migrasi SQL di `src/db/migrations/*.sql` dijalankan saat start dengan advisory
  lock dan tabel `schema_migrations`. **Hanya user-service yang menjalankan migrasi**; worker
  bergantung pada `user-service` healthy di compose.
- `auth/`: bcryptjs (cost 10, 4 di e2e), JWT 7 hari di cookie `fxp_session` (httpOnly, SameSite=Lax,
  `secure` dari env). Reset password: token acak 32 byte, disimpan hash SHA-256, berlaku 1 jam,
  sekali pakai. `reset-request` selalu 202 agar tidak membocorkan email terdaftar.
  `GET /api/auth/me` adalah tambahan di luar FSD untuk kebutuhan frontend.
- `watchlist/`, `alerts/`: hanya baris milik `user_id` dari sesi. Validasi DTO dengan
  class-validator, aturan bisnis di service (`validateAlertInput`: alert FX hanya target IDR).
- Aktivasi ulang alert menaikkan kolom `activation`; lihat skema di bawah.

### alert-worker (Node + BullMQ)

- `upsertJobScheduler('evaluate-alerts', { every: ALERT_INTERVAL_MS })`, concurrency 1,
  siklus diserialisasi (jadwal dan pemicu admin tidak tumpang tindih).
- `job.ts::runCycle` adalah logika murni (diuji unit): muat alert aktif → ambil harga lewat
  market-service → untuk setiap alert yang terpenuhi: **kirim email dulu**, lalu
  `markTriggered` dalam satu transaksi (`UPDATE ... WHERE status='active' AND activation=$2` +
  `INSERT notifications`). Email gagal → tidak ditandai, dicoba siklus berikutnya. Penandaan gagal
  setelah email terkirim → risiko email ganda, diterima untuk MVP (FSD bagian 5).
- HTTP kecil: `GET /health`; `POST /run` hanya jika `WORKER_ADMIN_ENABLED=true` (e2e).

### web (React + Vite)

- `lib/api.ts` satu-satunya pintu ke backend; `lib/queries.ts` hook TanStack Query dengan kunci
  terpusat; `lib/labels.ts` teks status data (Design System bagian 7).
- Komponen mengikuti tabel komponen Design System: `FxCard`, `CryptoTable`, `HistoryChart`
  (rentang 30/90/365, tabel data, CSV), `WatchlistPanel`, `Converter`, `AlertForm`, `DataBadge`,
  `ChangeCell`, `Toast`, `ConfirmDialog`, `States` (skeleton, error, kosong).
- Token warna/tipografi di `styles/tokens.css` (terang + gelap). Layout desktop/mobile di
  `styles/global.css`; mobile memakai tab bawah (Beranda, Grafik, Konverter, Akun).
- `data-testid` adalah kontrak dengan e2e; jangan diganti tanpa memperbarui `e2e/tests`.

### gateway (nginx)

Routing prefix (lihat `infra/gateway/conf.d/default.conf.template`), header keamanan dasar,
rate limit ringan per IP untuk endpoint kredensial `/api/auth/{login,register,reset-request,reset-confirm}` (env `AUTH_RATE_LIMIT`, `AUTH_RATE_BURST`; `/api/auth/me` tidak dibatasi), `/api/health/market` dan `/api/health/user` untuk pemantauan.
Semua `/api/*` lain → 404 JSON.

## Skema PostgreSQL (FSD bagian 5)

| Tabel                   | Catatan                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `users`                 | `email` unik, dinormalisasi huruf kecil oleh aplikasi; `password_hash` bcrypt                                |
| `watchlist_items`       | unik `(user_id, type, asset_code)`                                                                           |
| `alerts`                | `status` active/triggered/inactive, `activation` naik saat diaktifkan ulang, `triggered_at`                  |
| `notifications`         | unik `(alert_id, activation)` → tepat satu notifikasi per alert per aktivasi; menyimpan `price` saat terpicu |
| `password_reset_tokens` | `token_hash` unik, `expires_at`, `used_at`                                                                   |

Cache harga/kurs **tidak** ditulis ke database (hanya Redis).

## Kontrak API

Didefinisikan di `packages/shared/src/api.ts`. Setiap respons data: `{ data, updatedAt, source, stale }`.
Error: `{ statusCode, code, message, details? }` dengan `code` stabil (`UNSUPPORTED_CURRENCY`,
`DATA_UNAVAILABLE`, `UNAUTHORIZED`, `EMAIL_TAKEN`, `VALIDATION_ERROR`, dst.). Endpoint lengkap ada
di FSD bagian 6; tambahan di luar FSD: `GET /api/auth/me`, `GET /api/fx/currencies`,
`GET /api/health*`, `GET /api/market/metrics`, endpoint admin.

## Batasan yang disadari

- Single-flight cache hanya per proses; dengan >1 replika market-service, permintaan bersamaan
  antar replika bisa menghasilkan dua panggilan upstream. Cukup untuk MVP; solusi: lock Redis.
- Metrik cache disimpan di memori proses dan hilang saat restart.
- Worker dan user-service berbagi database (sesuai FSD). Jika ingin dipisah penuh, worker harus
  memakai endpoint internal user-service.
