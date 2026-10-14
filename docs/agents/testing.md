# Pengujian

Tiga lapis: unit (cepat, tanpa jaringan), e2e (stack penuh + mock upstream), uji beban (k6).

## Unit

| Workspace                 | Runner                           | Fokus                                                                                                  |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/shared`         | Vitest                           | format angka/tanggal, CSV, persen perubahan                                                            |
| `services/market-service` | Jest + ts-jest                   | `HttpClient` (timeout, retry, 429), `CacheService` (single-flight, stale, cooldown), FX/crypto/convert |
| `services/user-service`   | Jest + ts-jest                   | auth (hash, JWT, reset token), aturan alert, query service                                             |
| `services/alert-worker`   | Vitest                           | `conditionMet`, `runCycle` (email dulu, gagal tidak ditandai)                                          |
| `services/mock-upstream`  | Vitest                           | konsistensi data mock                                                                                  |
| `apps/web`                | Vitest + Testing Library (jsdom) | `ChangeCell`, `DataBadge`, label status                                                                |

Jalankan semua: `npm test`. Satu workspace: `npm test -w services/market-service`.
Catatan: Jest di WSL dengan repo di drive Windows (`/mnt/*`) lambat (puluhan detik per suite);
di CI (ubuntu) jauh lebih cepat.

## E2E (Playwright)

Suite ada di `e2e/tests`, berjalan terhadap stack yang sudah hidup:

| File                     | Cakupan                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dashboard.spec.ts`      | F1, F2, F3, F6 untuk tamu: label waktu data, tanda perubahan, rentang tanpa reload, tabel data, unduh CSV                                                                                              |
| `resilience.spec.ts`     | cache hit (satu panggilan upstream per mata uang), upstream down → stale + badge, 429 → cooldown, cache kosong → 503 pesan jelas + tombol coba lagi, mata uang tidak didukung, timeout → retry → stale |
| `converter.spec.ts`      | F5: USD→IDR, kripto↔fiat, validasi nominal, aset di luar top-20                                                                                                                                        |
| `auth-watchlist.spec.ts` | tamu ditolak (UI + API 401), registrasi/login/logout, cookie httpOnly 7 hari, email ganda, watchlist CRUD + duplikat 409, reset password via Mailpit (token sekali pakai)                              |
| `alerts.spec.ts`         | form alert, alert terpicu tepat sekali (email di Mailpit, status terpicu, siklus berikutnya tidak mengirim), aktivasi ulang, hapus dengan konfirmasi, alert FX                                         |
| `mobile.spec.ts`         | proyek `mobile-chromium` (Pixel 7): area bertumpuk, tab bawah, grafik 240 px, tanpa scroll horizontal                                                                                                  |

Proyek Playwright: `desktop-chromium` (1280×900, mengabaikan `mobile.spec.ts`) dan
`mobile-chromium` (hanya `mobile.spec.ts`).

### Menjalankan dengan Docker

```bash
cp .env.example .env
npm run stack:up        # docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait
npx playwright install chromium
npm run e2e             # atau: npm run e2e:ui
npm run stack:down
```

Overlay `docker-compose.e2e.yml` mengganti upstream ke `mock-upstream`, mengaktifkan endpoint admin
market-service dan worker, memperpendek interval alert (60 dtk), dan mengekspos port 4000 (mock),
3003 (worker), 8025 (Mailpit).

### Menjalankan tanpa Docker

`scripts/local-stack.mjs` menjalankan semua proses secara lokal:

```bash
npm run build
npm i -D embedded-postgres            # sekali; tidak masuk devDependencies repo
# butuh valkey-server atau redis-server di PATH (atau LOCAL_REDIS_BIN=/path/ke/valkey-server)
node scripts/local-stack.mjs          # Mailpit diunduh otomatis ke .local-stack/bin
npm run e2e                           # di terminal lain
```

Data Postgres disimpan di `.local-stack/pg`, atau di `~/.fxpulse-local-stack` bila repo berada di
drive Windows (`/mnt/*`) karena Postgres menolak permission di sana. Gateway lokal memakai
`vite preview` dengan proxy yang meniru routing nginx (`apps/web/vite.config.ts`).

Jika Chromium gagal start karena pustaka sistem hilang dan Anda tidak punya sudo:
`apt-get download libnspr4 libnss3 libasound2t64`, `dpkg -x` ke folder lokal, lalu set
`LD_LIBRARY_PATH` ke `<folder>/usr/lib/x86_64-linux-gnu` saat menjalankan Playwright.

### Kendali yang tersedia untuk tes

- Mock upstream: `POST /__control/mode {mode: ok|down|rate-limit|timeout}`,
  `POST /__control/price {id, usd?, idr?}`, `POST /__control/reset`, `GET /__control/stats`.
- market-service: `POST /api/market/cache/flush` (hapus cache segar, salinan terakhir tetap),
  `POST /api/market/cache/flush-all`, `GET /api/market/metrics`.
- alert-worker: `POST /run` menjalankan satu siklus dan mengembalikan ringkasan.
- Mailpit API: `GET /api/v1/search?query=to:<email>`, `GET /api/v1/message/<id>`.

## Uji beban (k6)

```bash
k6 run -e BASE_URL=http://localhost:8080 load/k6/dashboard.js             # 50 VU, 10 menit (PRD)
k6 run -e BASE_URL=http://localhost:8080 -e VUS=10 -e DURATION=1m load/k6/dashboard.js
```

Ringkasan menampilkan `cacheHitRatio` dan `upstreamRateLimited` dari `/api/market/metrics` dan
menyatakan LULUS jika hit ≥ 90% dan 429 = 0. Jalankan terhadap stack dev dengan upstream sungguhan
(`npm run dev:up`) untuk mengukur kuota CoinGecko yang sebenarnya; observasi 48 jam (Roadmap) memakai
metrik yang sama.

## Menambah test

- Unit: letakkan `*.spec.ts` (Jest) atau `*.test.ts` (Vitest) di samping kode.
- E2E: tambahkan `data-testid` di komponen, helper di `e2e/support`, dan gunakan `resetMarket`
  bila mengubah mode mock. Hindari `waitForTimeout`; pakai `expect(...).toHave*` yang menunggu.
