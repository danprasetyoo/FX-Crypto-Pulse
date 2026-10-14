# Catatan keputusan (ADR ringkas)

Format: konteks → keputusan → konsekuensi. Tambahkan entri baru di bawah dengan nomor berurutan.

## ADR-001 Monorepo npm workspaces, bukan multi-repo

Konteks: lima komponen kecil yang berbagi kontrak API. Keputusan: satu repo dengan workspaces
(`packages/`, `services/`, `apps/`, `e2e`) dan paket `@fxpulse/shared` untuk tipe. Konsekuensi:
satu lockfile, satu CI; Dockerfile harus memfilter workspace agar image tetap kecil.

## ADR-002 Pembagian microservice: market, user, worker, web, gateway

Konteks: PRD menyebut backend + worker + frontend; permintaan proyek ingin struktur microservice.
Keputusan: data pasar (tanpa state pengguna) dipisah dari data akun; worker terpisah karena
siklus hidupnya berbeda; gateway nginx menyatukan origin untuk cookie. Konsekuensi: worker dan
user-service berbagi PostgreSQL (sesuai FSD "cocokkan dengan tabel alert di PostgreSQL");
pemisahan penuh dicatat sebagai pekerjaan lanjutan.

## ADR-003 Frankfurter dipanggil dengan base EUR dan kurs silang dihitung lokal

Konteks: FSD meminta `/fx/latest?base=IDR`. Dengan `base=IDR` Frankfurter mengembalikan angka
sangat kecil (6e-05) yang dibulatkan sehingga presisi hilang. Keputusan: selalu `base=EUR`
(native ECB), hitung `quote/base = r[base]/r[quote]`. Konsekuensi: satu panggilan untuk semua
pasangan; nilai "USD / IDR" berarti IDR per 1 USD (sesuai mockup 16.250,00).

## ADR-004 Perubahan harian FX dari time series 14 hari

Konteks: perlu kurs hari kerja ECB sebelumnya. Keputusan: satu panggilan `/{start}..` (14 hari)
lalu ambil dua tanggal terakhir. Konsekuensi: tidak perlu panggilan `latest` terpisah; TTL 1 jam.

## ADR-005 Cache dua lapis (`fresh:` + `last:`) dan cooldown 429

Konteks: FSD 7-8 meminta fallback stale dan larangan retry saat 429. Keputusan: simpan salinan
"terakhir diketahui" 7 hari terpisah dari cache segar; 429 memasang `cooldown:` selama max(TTL,
Retry-After). Konsekuensi: endpoint admin `flush` hanya menghapus `fresh:` agar skenario stale
bisa diuji tanpa menunggu TTL.

## ADR-006 Tepat-sekali per aktivasi dengan kolom `activation`

Konteks: FSD meminta `alert_id` unik di tabel notifikasi, tetapi juga mengizinkan alert
diaktifkan kembali. Keputusan: `alerts.activation` bertambah saat aktivasi ulang; unik
`(alert_id, activation)`. Konsekuensi: riwayat notifikasi tersimpan, jaminan tepat sekali per
aktivasi tetap berlaku lewat `UPDATE ... WHERE status='active' AND activation=$2`.

## ADR-007 Alert FX hanya target IDR; alert kripto IDR atau USD

Konteks: FSD menyebut kolom `mata_uang` tanpa batasan. Keputusan: FX dinyatakan sebagai
`<quote>/IDR` sehingga target selalu IDR; kripto boleh IDR/USD (keduanya ada di cache top-20).
Konsekuensi: validasi di `validateAlertInput`; UI menyembunyikan pilihan mata uang untuk FX.

## ADR-008 `GET /api/auth/me` ditambahkan di luar FSD

Konteks: SPA perlu tahu sesi saat ini tanpa menyimpan state di localStorage. Keputusan: endpoint
read-only yang mengembalikan pengguna dari cookie. Konsekuensi: kontrak FSD lain tidak berubah.

## ADR-009 Jest untuk layanan NestJS, Vitest untuk yang lain

Konteks: DI NestJS memerlukan `emitDecoratorMetadata`, yang tidak didukung esbuild/Vitest tanpa
plugin tambahan. Keputusan: ts-jest untuk NestJS; Vitest untuk shared, worker, mock, web.
Konsekuensi: dua runner; perintah tetap seragam lewat `npm test`.

## ADR-010 Mock upstream sebagai layanan e2e, bukan stub di browser

Konteks: e2e harus deterministik dan menguji jalur cache/retry/429 di backend. Keputusan:
`services/mock-upstream` meniru Frankfurter + CoinGecko dengan endpoint kendali. Konsekuensi:
overlay compose e2e; angka mock mengikuti mockup UI agar asersi mudah dibaca.

## ADR-011 Stack lokal tanpa Docker

Konteks: mesin dev (WSL tanpa integrasi Docker Desktop) tidak bisa menjalankan compose.
Keputusan: `scripts/local-stack.mjs` memakai `embedded-postgres`, binari Valkey/Redis, Mailpit yang
diunduh, dan `vite preview` sebagai gateway. Konsekuensi: e2e bisa dijalankan di mana pun; jalur
resmi tetap Docker Compose (CI).

## ADR-012 Format angka: ≥ 1 juta tanpa desimal, selain itu 2 desimal

Konteks: harga IDR besar (Rp1.410.000.000) dan harga USD (86.769,23) tampil berdampingan.
Keputusan: `formatNumber` memakai ambang 1 juta; kurs FX selalu 2 desimal (`formatFxRate`).
Konsekuensi: konsisten di tabel, konverter, email, dan asersi e2e.
