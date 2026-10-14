# Konvensi kode

## Umum

- TypeScript strict di semua workspace (`tsconfig.base.json`). Jangan matikan `strict`.
- ESLint flat config di root (`eslint.config.mjs`), Prettier (`printWidth` 100, single quote).
  Jalankan `npm run lint` dan `npm run format` sebelum commit.
- Node 22 (`.nvmrc`). `fetch` global dipakai, bukan axios.
- Bahasa: komentar dan pesan pengguna dalam bahasa Indonesia; identifier, kolom DB, dan enum dalam
  bahasa Inggris.
- Komentar menjelaskan _mengapa_ (merujuk bagian PRD/FSD/Design System), bukan mengulang kode.

## Paket shared

- Hanya tipe, konstanta, dan fungsi murni tanpa dependensi runtime.
- Build ganda: `dist/esm` (Vite/Vitest) dan `dist/cjs` (NestJS/Jest). Impor internal memakai
  akhiran `.js` agar valid di kedua mode.
- Mengubah `api.ts` berarti mengubah kontrak: periksa semua konsumen (`services/*`, `apps/web`, `e2e`).

## Layanan NestJS (market-service, user-service)

- Struktur per fitur: `<fitur>/<fitur>.module.ts`, `.controller.ts`, `.service.ts`, `dto.ts`,
  `<fitur>.service.spec.ts`. Modul lintas fitur: `common/`, `config.ts`, `config.module.ts`.
- Konfigurasi dibaca sekali lewat `loadConfig(env)` dan disuntikkan dengan token `CONFIG`.
  Semua variabel punya default aman untuk dev; produksi memvalidasi yang kritis (mis. `JWT_SECRET`).
- Error ke klien hanya lewat subclass `ApiHttpException` di `common/errors.ts`. Filter global
  `ApiExceptionFilter` menyeragamkan bentuk dan menyembunyikan detail teknis.
- Controller tipis: parsing/validasi parameter, panggil service, bungkus `envelope()`.
  Logika bisnis dan panggilan upstream/DB ada di service.
- Query SQL ditulis langsung dengan parameter `$n` (tanpa ORM). Jangan menyusun SQL dari string
  pengguna. Transaksi lewat `DbService.transaction`.
- Log: `Logger` NestJS. `warn` untuk kondisi terdegradasi (stale, retry, cooldown), `error` untuk
  kegagalan yang butuh tindakan.

## alert-worker

- Logika murni di `job.ts`, `evaluate.ts`, `prices.ts`; efek samping (DB, SMTP, Redis) lewat
  antarmuka (`AlertsRepo`, `PriceSource`, `Mailer`) agar mudah dimock di Vitest.
- Satu siklus = satu fungsi `runCycle` yang mengembalikan ringkasan; jangan menambah state global.

## Web

- Komponen fungsi + hook; tanpa state manager global selain TanStack Query.
- Data server hanya lewat `lib/api.ts` dan `lib/queries.ts`. Komponen tidak memanggil `fetch`.
- Format angka/tanggal hanya lewat `@fxpulse/shared` (`formatNumber`, `formatFxRate`,
  `formatChangePct`, `formatDateId`, `formatTimeWib`) agar konsisten dengan email dan tes.
- Setiap angka harga disertai `DataBadge`; perubahan memakai `ChangeCell`.
- Aksi destruktif memakai `ConfirmDialog`. Umpan balik aksi memakai `useToast`.
- `data-testid` deskriptif dan stabil (`fx-row-USD`, `alert-status-<id>`). Lihat daftar di
  `e2e/tests` sebelum mengganti.
- CSS: token di `styles/tokens.css`, kelas utilitas di `styles/global.css`. Hindari inline style
  kecuali nilai dinamis.

## Mock upstream dan e2e

- `services/mock-upstream` harus meniru bentuk respons API sungguhan (field yang dipakai klien).
  Angka deterministik mengikuti mockup UI (USD/IDR 16.250, BTC Rp1,41 M).
- E2E memakai `support/` untuk kendali mock, Mailpit, dan auth. Setiap test yang mengubah mode
  mock wajib `resetMarket` di `beforeEach`/`afterAll`.
- Test tidak boleh bergantung pada urutan antar file; data pengguna dibuat unik (`uniqueEmail`).

## Git dan rilis

- Branch: `main` (rilis), `develop` (integrasi), fitur `feat/<nama>`, perbaikan `fix/<nama>`.
- Pesan commit: Conventional Commits (`feat(market): ...`, `fix(web): ...`, `docs: ...`).
- Versi semver; tag `vX.Y.Z` memicu workflow Release. Perbarui `CHANGELOG.md` di PR yang sama.
