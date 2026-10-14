# Operasional: env, Docker, CI/CD, deploy

## Variabel lingkungan

Daftar lengkap dengan default ada di [`.env.example`](../../.env.example). Yang wajib diganti di
produksi: `JWT_SECRET` (≥ 32 karakter acak), `POSTGRES_PASSWORD`/`DATABASE_URL`, `SMTP_*`,
`APP_BASE_URL`, `COOKIE_SECURE=true`. `COINGECKO_API_KEY` opsional (demo key).
`MARKET_ADMIN_ENABLED` dan `WORKER_ADMIN_ENABLED` harus `false` di produksi.

## Docker

- `infra/docker/node-service.Dockerfile` dipakai semua layanan Node dengan `--build-arg SERVICE=<nama>`.
  Multi-stage: instal workspace yang dibutuhkan → build shared + layanan → `npm prune --omit=dev` →
  image runtime `node:22-alpine` non-root dengan `curl` untuk healthcheck.
- `infra/docker/web.Dockerfile`: build Vite → nginx statis (`web.nginx.conf`, SPA fallback).
- `infra/gateway`: nginx dengan template envsubst (`conf.d/default.conf.template`).
- Compose:
  - `docker-compose.yml` — stack lengkap (postgres, redis, mailpit, 3 layanan, web, gateway).
  - `docker-compose.e2e.yml` — overlay e2e (mock upstream, admin endpoint, port bantu).
  - `docker-compose.prod.yml` — overlay produksi (image dari registry, tanpa Mailpit, admin off).
- Image diberi nama `${IMAGE_PREFIX}/<service>:${IMAGE_TAG}`; default `fxpulse/<service>:local`.

Perintah:

```bash
docker compose up -d --build --wait                                   # dev dengan upstream sungguhan
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait
IMAGE_PREFIX=ghcr.io/<org>/fx-crypto-pulse IMAGE_TAG=v1.0.0 \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --pull always
```

## CI/CD (GitHub Actions)

| Workflow      | Pemicu                                                        | Isi                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`      | push ke `main`/`develop`, semua PR                            | job `lint-test-build` (format, lint, typecheck, unit, build, artefak web), job `docker-build` (matrix semua image, cache GHA), job `e2e` (compose + overlay e2e, Playwright chromium, unggah report, log compose saat gagal) |
| `release.yml` | tag `v*.*.*` atau manual                                      | build & push 5 image ke GHCR dengan tag semver/sha/latest, lalu GitHub Release dengan catatan dari `CHANGELOG.md`                                                                                                            |
| `deploy.yml`  | setelah Release sukses, atau manual (pilih tag & environment) | scp compose ke server, `docker compose pull && up -d --wait`, cek health. Dilewati dengan peringatan bila secrets belum diatur                                                                                               |

Secrets deploy: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, opsional `DEPLOY_PORT`.
Server butuh Docker + compose dan file `.env` produksi di `DEPLOY_PATH`. Gunakan GitHub Environment
`production` dengan required reviewers bila ingin persetujuan manual.

Badge status CI ada di `README.md`; ganti `<org>/<repo>` sesuai repositori.

## Deploy gratis / sederhana

Satu VM kecil (mis. 1 vCPU / 1 GB) cukup untuk MVP: Postgres + Redis + 3 layanan Node + 2 nginx.
Alternatif tanpa VM: Redis di Upstash (set `REDIS_URL` TLS `rediss://`), Postgres di Neon/Supabase,
layanan di Fly.io/Railway memakai image GHCR. Gateway bisa diganti reverse proxy platform; routing
prefix harus sama dengan `infra/gateway`.

## Runbook singkat

| Gejala                                             | Periksa                                                                                 | Tindakan                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Badge "Sumber sedang tidak tersedia" terus-menerus | `GET /api/market/metrics` (`upstreamErrors`, `upstreamRateLimited`), log market-service | 429: tunggu cooldown, cek kuota CoinGecko, pertimbangkan `COINGECKO_API_KEY`. Timeout: cek jaringan egress |
| Alert tidak terkirim                               | `GET :3003/health` (`lastSummary`), log worker, tabel `alerts`/`notifications`          | SMTP gagal → alert tetap aktif, perbaiki SMTP; harga tidak tersedia → aset di luar top-20                  |
| Email ganda untuk satu alert                       | log worker "email terkirim tetapi penandaan gagal"                                      | Diterima MVP (FSD 5); cek koneksi DB                                                                       |
| Login gagal semua                                  | `JWT_SECRET` berubah antar deploy?                                                      | Sesi lama tidak valid setelah secret berganti; pengguna login ulang                                        |
| Migrasi gagal saat start                           | log user-service                                                                        | Perbaiki SQL, restart; migrasi idempoten per file lewat `schema_migrations`                                |

Observasi rilis (Roadmap): pantau `upstreamRateLimited` tetap 0 selama 48 jam sebelum tag `v1.0.0`.
