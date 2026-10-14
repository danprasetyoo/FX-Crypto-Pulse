# PRD — FX & Crypto Pulse

Oct 13, 2026 · @IT Dev

Dashboard kurs mata uang dan harga kripto dengan grafik historis, konverter, dan alert harga via Telegram atau email, dibangun dengan cache agar tetap dalam batas rate limit API gratis (Frankfurter, CoinGecko). Target MVP: 1,5 minggu.

## Masalah & tujuan

Pengguna yang memantau beberapa mata uang dan aset kripto harus membuka banyak situs dan tidak mendapat peringatan saat harga menyentuh target. Tujuan: satu watchlist dengan alert otomatis.

## Target pengguna

- Pekerja keuangan yang memantau kurs IDR terhadap USD, EUR, SGD, dll.
- Investor ritel kripto.

## Ruang lingkup

**Masuk MVP:** kurs harian (Frankfurter), harga kripto (CoinGecko), grafik 30/90/365 hari, konverter, watchlist, alert harga di atas/di bawah target.

**Di luar MVP:** trading, integrasi dompet atau exchange, rekomendasi investasi.

## Fitur & prioritas

| ID  | User story                                                                                                     | Prioritas |
| --- | -------------------------------------------------------------------------------------------------------------- | --------- |
| F1  | Sebagai pengguna, saya melihat kurs terbaru pasangan mata uang pilihan beserta perubahan harian (%).           | Must      |
| F2  | Sebagai pengguna, saya melihat harga top-20 kripto dalam IDR dan USD.                                          | Must      |
| F3  | Sebagai pengguna, saya melihat grafik historis dengan rentang 30, 90, 365 hari.                                | Must      |
| F4  | Sebagai pengguna, saya membuat alert ("BTC < Rp900 jt") dan menerima notifikasi sekali saat kondisi terpenuhi. | Must      |
| F5  | Sebagai pengguna, saya mengonversi nominal antar mata uang dan kripto.                                         | Should    |
| F6  | Sebagai pengguna, saya mengekspor data grafik ke CSV.                                                          | Could     |

## Kebutuhan non-fungsional

- Panggilan ke CoinGecko tidak melebihi kuota free tier: harga di-cache 60 detik, data historis 1 jam, kurs Frankfurter 1 jam (data ECB diperbarui sekali sehari kerja).
- Alert dievaluasi tiap 5 menit dengan toleransi keterlambatan maksimal 10 menit.
- Dashboard tetap tampil dengan data cache terakhir (dan label waktu) jika API down.
- Disclaimer: data hanya informasi, bukan saran investasi.

## Arsitektur & data

1. Backend NestJS/Express menjadi proxy ke Frankfurter dan CoinGecko; frontend tidak memanggil API eksternal langsung.
2. Redis (Upstash) menyimpan cache respons dan antrian job.
3. Worker (BullMQ) berjalan tiap 5 menit: ambil harga, cocokkan dengan tabel alert di PostgreSQL, kirim notifikasi, tandai alert terpicu.
4. Frontend (React + Chart.js) menampilkan dashboard dan watchlist.

## Metrik sukses

- Cache hit ratio ≥ 90% saat uji beban 50 pengguna simultan (k6).
- Nol error 429 dari CoinGecko selama 48 jam berjalan.
- 100% alert uji terkirim tepat sekali.

## Milestone

1. Hari 1–2: proxy API + caching + test.
2. Hari 3–5: dashboard, grafik, konverter.
3. Hari 6–8: auth, watchlist, alert + worker.
4. Hari 9–10: uji beban, Docker Compose, deploy, README, rilis v1.0.0.

## Risiko

- Kebijakan free tier CoinGecko berubah atau mewajibkan key → simpan key opsional di env, siapkan fallback CoinCap.
- Frankfurter tidak memuat semua mata uang → tampilkan hanya mata uang yang didukung.

## Definition of Done repo

- README: deskripsi, GIF/screenshot demo, diagram arsitektur, cara setup, link live demo.
- `.env.example`; API key hanya di environment variable atau GitHub Secrets.
- CI GitHub Actions: lint + unit test di setiap push dan PR, badge status di README.
- Penanganan batas API: timeout, retry dengan backoff, cache, pesan error yang jelas.
- Dockerfile atau panduan deploy gratis.
- Lisensi MIT, `CHANGELOG.md`, rilis bertag `v1.0.0`.
