# AGENTS.md — Panduan untuk agen AI dan pengembang

Dokumen ini adalah titik masuk bagi siapa pun (manusia atau agen AI seperti Claude Code, Copilot, Cursor)
yang mengerjakan repo **FX & Crypto Pulse**. Baca ini dulu, lalu dokumen rinci di [`docs/agents/`](docs/agents/).

## Ringkas: apa ini

Dashboard kurs mata uang (Frankfurter/ECB) dan harga kripto (CoinGecko) dengan grafik historis,
konverter, watchlist per akun, dan alert harga via email. Monorepo npm workspaces, arsitektur
microservice, dijalankan dengan Docker Compose. Spesifikasi produk ada di [`docs/`](docs/)
(PRD, FSD, Design System, Roadmap, mockup UI). **Spesifikasi di `docs/` adalah sumber kebenaran**;
jika kode dan spesifikasi berbeda, ikuti spesifikasi atau catat deviasinya di
[`docs/agents/decisions.md`](docs/agents/decisions.md).

## Peta repo

| Path                      | Isi                                                                                               | Teknologi                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/shared`         | Tipe kontrak API, konstanta, util format (id-ID)                                                  | TypeScript, build ganda ESM+CJS                  |
| `services/market-service` | Proxy + cache ke Frankfurter & CoinGecko: `/api/fx`, `/api/crypto`, `/api/convert`, `/api/market` | NestJS 11, ioredis, Jest                         |
| `services/user-service`   | Auth, watchlist, alert, migrasi skema: `/api/auth`, `/api/watchlist`, `/api/alerts`               | NestJS 11, pg, class-validator, Jest             |
| `services/alert-worker`   | Evaluasi alert tiap 5 menit, kirim email tepat sekali                                             | BullMQ, pg, nodemailer, Vitest                   |
| `services/mock-upstream`  | Tiruan Frankfurter + CoinGecko untuk e2e (mode ok/down/429/timeout)                               | Express, Vitest                                  |
| `apps/web`                | Frontend SPA (hanya memanggil `/api`)                                                             | React 19, Vite, TanStack Query, Chart.js, Vitest |
| `infra/gateway`           | nginx: satu origin, routing prefix ke layanan                                                     | nginx                                            |
| `infra/docker`            | Dockerfile generik layanan Node dan web                                                           | Docker multi-stage                               |
| `e2e`                     | Pengujian end-to-end terhadap stack compose                                                       | Playwright                                       |
| `load/k6`                 | Uji beban metrik sukses PRD                                                                       | k6                                               |
| `scripts/local-stack.mjs` | Menjalankan stack tanpa Docker                                                                    | Node                                             |
| `.github/workflows`       | CI (lint, unit, build, e2e), Release (GHCR), Deploy (SSH)                                         | GitHub Actions                                   |

## Perintah yang sering dipakai

```bash
npm ci                     # instal semua workspace (Node 22)
npm run lint && npm run typecheck && npm test && npm run build
npm run stack:up           # docker compose + overlay e2e (mock upstream, admin endpoint)
npm run e2e                # Playwright terhadap stack yang hidup (http://localhost:8080)
npm run stack:down
npm run dev:up             # stack dev dengan upstream sungguhan (butuh internet)
```

Tanpa Docker: `npm run build && npm i -D embedded-postgres && node scripts/local-stack.mjs`
(butuh `valkey-server`/`redis-server`; lihat [`docs/agents/testing.md`](docs/agents/testing.md)).

## Aturan kerja (wajib)

1. **Frontend tidak pernah memanggil API eksternal.** Semua lewat `/api` di gateway. Panggilan ke
   Frankfurter/CoinGecko hanya di `market-service` melalui `HttpClient` + `CacheService`.
2. **Setiap respons data memakai `ApiEnvelope`** (`data`, `updatedAt`, `source`, `stale`).
   UI wajib menampilkan waktu data di setiap angka (Design System prinsip 1).
3. **Error ke pengguna tidak menyebut nama API atau kode teknis** (429, CoinGecko, dst.).
   Pakai kelas error di `common/errors.ts`; detail teknis hanya ke log.
4. **Perubahan harga selalu dengan tanda dan panah**, bukan hanya warna. Pakai `formatChangePct`.
5. **Alert dikirim tepat sekali per aktivasi.** Urutan worker: email dulu, lalu satu transaksi
   (ubah status + insert `notifications` dengan unique `(alert_id, activation)`). Jangan ubah urutan ini.
6. **Rahasia hanya di env / GitHub Secrets.** Jangan commit `.env`; perbarui `.env.example` saat
   menambah variabel.
7. **Tambah test bersama kode.** Unit test untuk logika (cache, retry, evaluasi alert, format),
   e2e untuk alur pengguna. CI menolak PR yang gagal lint/test/e2e.
8. **Bahasa:** UI dan pesan pengguna dalam bahasa Indonesia; kode, nama kolom, dan enum dalam
   bahasa Inggris (`active`/`triggered`/`inactive` ↔ aktif/terpicu/nonaktif).
9. **Jangan mematikan guardrail e2e:** endpoint admin (`/api/market/cache/flush`, worker `/run`)
   hanya aktif lewat env `*_ADMIN_ENABLED=true` dan tidak boleh aktif di produksi.
10. **Dokumentasikan keputusan** yang menyimpang dari spesifikasi di `docs/agents/decisions.md`
    dan perbarui `CHANGELOG.md` untuk perubahan yang terlihat pengguna.

## Alur pengembangan yang disarankan untuk agen

1. Baca spesifikasi terkait di `docs/` dan dokumen rinci di `docs/agents/`.
2. Cari kontrak yang terdampak di `packages/shared/src/api.ts`; ubah kontrak dulu bila perlu.
3. Implementasi di layanan terkait + unit test; jalankan `npm test -w <workspace>`.
4. Jika alur pengguna berubah, perbarui/tambah e2e di `e2e/tests` dan `data-testid` di web.
5. Jalankan `npm run lint && npm run typecheck && npm run build`, lalu e2e terhadap stack.
6. Perbarui dokumen: `README.md`, `CHANGELOG.md`, `docs/agents/*` jika perilaku/arsitektur berubah.

## Dokumen rinci

- [`docs/agents/README.md`](docs/agents/README.md) — indeks dan cara memakai folder ini
- [`docs/agents/architecture.md`](docs/agents/architecture.md) — layanan, alur data, cache, worker, gateway
- [`docs/agents/conventions.md`](docs/agents/conventions.md) — gaya kode, struktur modul, error, logging
- [`docs/agents/testing.md`](docs/agents/testing.md) — unit, e2e, mock upstream, uji beban, stack lokal
- [`docs/agents/operations.md`](docs/agents/operations.md) — env, Docker, CI/CD, deploy, runbook
- [`docs/agents/decisions.md`](docs/agents/decisions.md) — catatan keputusan dan deviasi dari spesifikasi
