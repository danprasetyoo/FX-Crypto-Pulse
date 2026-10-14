# FSD — FX & Crypto Pulse

Oct 13, 2026 · @IT Dev

Dokumen ini menjabarkan PRD FX & Crypto Pulse menjadi spesifikasi fungsional untuk tim pengembang, memakai asumsi default yang sudah disepakati.

## 1. Tujuan dan ruang lingkup

Aplikasi menampilkan kurs FX dan harga kripto dalam satu dashboard, dengan grafik historis, konverter, dan alert harga. Tujuannya satu watchlist dengan notifikasi otomatis saat target tercapai.

| Area      | Masuk v1.0.0                                                            | Di luar MVP                           |
| --------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Kurs FX   | Kurs harian dari Frankfurter dan perubahan harian (%)                   | Kurs intraday                         |
| Kripto    | Top-20 dalam IDR dan USD dari CoinGecko                                 | Trading, dompet, exchange             |
| Grafik    | Rentang 30, 90, dan 365 hari                                            | Indikator teknikal                    |
| Konverter | Nominal antar mata uang dan kripto (F5, Should)                         | -                                     |
| Watchlist | Tersimpan per akun                                                      | Berbagi watchlist                     |
| Alert     | Harga di atas atau di bawah target, via email, nonaktif setelah terpicu | Notifikasi Telegram (fase berikutnya) |
| Ekspor    | CSV dari data grafik (F6, Could)                                        | -                                     |

Asumsi: F5 dan F6 tetap masuk v1.0.0. Jika jadwal terancam, F6 ditunda lebih dulu.

Data FX adalah kurs referensi ECB yang diperbarui sekali sehari pada hari kerja, bukan harga real-time. UI wajib menampilkan tanggal data di setiap angka FX.

## 2. Pengguna dan autentikasi

Dashboard, grafik, dan konverter bisa dipakai tanpa login. Watchlist dan alert hanya tersedia untuk pengguna terdaftar.

| Peran              | Akses                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Tamu               | Melihat kurs, harga kripto, grafik, dan konverter. Tidak bisa menyimpan watchlist atau alert. |
| Pengguna terdaftar | Watchlist, alert, dan ekspor CSV                                                              |
| Operator           | Tidak ada panel admin di MVP. Akses database dan worker lewat server.                         |

Autentikasi:

- Registrasi dan login memakai email dan password.
- Password di-hash dengan bcrypt atau argon2. Password tidak pernah disimpan dalam bentuk teks biasa.
- Sesi memakai JWT di cookie httpOnly dengan masa berlaku 7 hari.
- Reset password lewat email termasuk MVP. Ini asumsi karena PRD tidak menyebutnya.

Asumsi: watchlist disimpan di server per akun, bukan di browser, sehingga bisa diakses dari perangkat lain.

## 3. Kebutuhan fungsional

Setiap fitur memiliki kriteria penerimaan yang bisa diuji. Prioritas mengikuti PRD: Must untuk MVP, Should dan Could mengikuti asumsi di bagian 1.

| ID  | Kebutuhan                                                           | Kriteria penerimaan                                                                                                                                                                                        | Prioritas |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F1  | Kurs terbaru pasangan mata uang pilihan dengan perubahan harian (%) | Menampilkan nilai kurs, tanggal data ECB, dan perubahan % terhadap hari kerja sebelumnya. Hanya mata uang yang didukung Frankfurter yang bisa dipilih.                                                     | Must      |
| F2  | Harga top-20 kripto dalam IDR dan USD                               | Menampilkan 20 aset dengan harga IDR, harga USD, dan perubahan 24 jam. Menampilkan waktu terakhir diperbarui.                                                                                              | Must      |
| F3  | Grafik historis 30, 90, dan 365 hari                                | Rentang bisa diganti tanpa memuat ulang halaman. Berlaku untuk kurs FX dan harga kripto.                                                                                                                   | Must      |
| F4  | Alert harga di atas atau di bawah target                            | Pengguna memilih aset, kondisi (di atas atau di bawah), dan nilai target. Worker mengecek setiap 5 menit dengan toleransi 10 menit. Notifikasi email dikirim tepat sekali. Alert nonaktif setelah terpicu. | Must      |
| F5  | Konverter nominal antar mata uang dan kripto                        | Input nominal, pilih asal dan tujuan, hasil memakai data cache terbaru, dan menampilkan waktu data.                                                                                                        | Should    |
| F6  | Ekspor data grafik ke CSV                                           | File berisi tanggal, nilai, dan rentang yang sedang dipilih.                                                                                                                                               | Could     |

Aturan umum untuk semua fitur: jika API eksternal gagal, dashboard menampilkan data cache terakhir beserta label waktunya.

## 4. Arsitektur sistem

Frontend hanya memanggil backend. Backend membaca cache Redis dan mengambil data dari API eksternal bila cache kosong. Worker berjalan terpisah dan memakai antrian yang sama.

&#91;embedded content: arsitektur sistem · 6 komponen, frontend tidak memanggil API eksternal\]

## 5. Model data

Data permanen disimpan di PostgreSQL. Cache harga dan kurs disimpan di Redis dan tidak ditulis ke database.

| Tabel           | Kolom utama                                                                                                                    | Catatan                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| users           | id, email (unik), password\_hash, created\_at                                                                                  | Email dinormalisasi ke huruf kecil.                           |
| watchlist\_item | id, user\_id, tipe (fx atau crypto), kode\_aset, created\_at                                                                   | Unik per kombinasi user\_id, tipe, dan kode\_aset.            |
| alert           | id, user\_id, tipe, kode\_aset, kondisi (above atau below), target, mata\_uang, status (aktif, terpicu, nonaktif), terpicu\_at | Status berubah dari aktif ke terpicu hanya sekali.            |
| notifikasi      | id, alert\_id (unik), channel, status (sent atau failed), dikirim\_at                                                          | Kolom alert\_id yang unik menjamin satu notifikasi per alert. |

Urutan worker: kirim email dulu, lalu dalam satu transaksi ubah status alert menjadi terpicu dan buat baris notifikasi. Jika email gagal, tidak ada yang ditandai dan alert dicoba lagi pada siklus berikutnya. Risiko kecil: email terkirim tetapi aplikasi mati sebelum transaksi selesai, sehingga email bisa terkirim dua kali. Ini diterima untuk MVP.

## 6. API internal

Frontend hanya memanggil endpoint ini. Prefiks semua route adalah /api.

| Metode | Endpoint                                   | Fungsi                                          | Akses    |
| ------ | ------------------------------------------ | ----------------------------------------------- | -------- |
| GET    | /fx/latest?base=IDR&quotes=USD,EUR,SGD     | Kurs terbaru dan perubahan harian (F1)          | Tamu     |
| GET    | /fx/history?pair=USD-IDR&range=30          | Riwayat kurs, range 30, 90, atau 365 (F3)       | Tamu     |
| GET    | /crypto/top?vs=idr,usd                     | Top-20 kripto dalam IDR dan USD (F2)            | Tamu     |
| GET    | /crypto/history?id=bitcoin&vs=idr&range=90 | Riwayat harga kripto (F3)                       | Tamu     |
| GET    | /convert?from=USD&to=IDR&amount=100        | Konversi nominal (F5)                           | Tamu     |
| POST   | /auth/register                             | Registrasi dengan email dan password            | Tamu     |
| POST   | /auth/login                                | Login dan membuat sesi                          | Tamu     |
| POST   | /auth/logout                               | Menghapus sesi                                  | Pengguna |
| POST   | /auth/reset-request                        | Mengirim email reset password                   | Tamu     |
| POST   | /auth/reset-confirm                        | Mengganti password dengan token                 | Tamu     |
| GET    | /watchlist                                 | Daftar watchlist milik pengguna                 | Pengguna |
| POST   | /watchlist                                 | Menambah aset ke watchlist                      | Pengguna |
| DELETE | /watchlist/:id                             | Menghapus aset dari watchlist                   | Pengguna |
| GET    | /alerts                                    | Daftar alert milik pengguna                     | Pengguna |
| POST   | /alerts                                    | Membuat alert (F4)                              | Pengguna |
| PATCH  | /alerts/:id                                | Mengubah target atau mengaktifkan kembali alert | Pengguna |
| DELETE | /alerts/:id                                | Menghapus alert                                 | Pengguna |

Format respons data: setiap respons menyertakan `updatedAt`, `source` (live atau cache), dan `stale` (true jika data lebih tua dari batas cache). Ekspor CSV (F6) dibuat di frontend dari data yang sudah dimuat, sehingga tidak perlu endpoint baru.

Ketika upstream mengembalikan 429 atau timeout, backend mengembalikan data cache terakhir dengan `stale: true`, bukan error.

## 7. Cache, batas API, dan alur worker

| Data                 | TTL cache | Sumber                                   | Catatan                                 |
| -------------------- | --------- | ---------------------------------------- | --------------------------------------- |
| Harga kripto top-20  | 60 detik  | CoinGecko, satu request untuk semua koin | Dipakai juga oleh worker dan konverter. |
| Riwayat harga kripto | 1 jam     | CoinGecko, per koin dan rentang          | Hanya diambil ulang saat cache habis.   |
| Kurs FX              | 1 jam     | Frankfurter                              | Data ECB hanya berubah pada hari kerja. |

Aturan: request pengguna tidak pernah langsung ke API eksternal. Jika cache kosong, backend mengambil data sekali. Permintaan bersamaan untuk kunci yang sama digabung menjadi satu panggilan.

Alur worker per siklus:

&#91;embedded content: alur worker alert · 2 keputusan, alert tidak ditandai sebelum email terkirim\]

## 8. Non-fungsional dan penanganan error

| Kategori                 | Target                                                    | Cara uji                                        |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------- |
| Cache hit ratio          | 90% atau lebih saat 50 pengguna bersamaan                 | k6, beban 10 menit                              |
| Error 429 dari CoinGecko | Nol selama 48 jam berjalan                                | Log backend dan metrik upstream                 |
| Ketepatan alert          | Setiap alert uji terkirim tepat sekali                    | Skenario uji dengan target yang sudah terlewati |
| Keterlambatan alert      | Maksimal 10 menit setelah harga melewati target           | Catat waktu harga dan waktu email               |
| Ketersediaan dashboard   | Tetap tampil saat API eksternal down                      | Matikan koneksi upstream di staging             |
| Keamanan                 | API key hanya di environment variable atau GitHub Secrets | Pemeriksaan repo sebelum rilis                  |

Penanganan error:

| Kondisi                         | Perilaku sistem                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Timeout dari API eksternal      | Retry dua kali dengan backoff eksponensial. Jika gagal, kembalikan cache dengan `stale: true`. |
| 429 dari CoinGecko              | Tunda request sampai batas cache berikutnya. Tidak ada retry berulang.                         |
| Cache kosong dan upstream gagal | Tampilkan pesan yang jelas: data belum tersedia, coba lagi nanti.                              |
| Pasangan FX tidak didukung      | Tolak input dan tampilkan daftar mata uang yang didukung.                                      |
| Email alert gagal               | Alert tetap aktif dan dicoba pada siklus berikutnya (lihat bagian 5).                          |

Disclaimer: setiap halaman harga dan alert menampilkan teks bahwa data hanya informasi dan bukan saran investasi.

## 9. Asumsi, risiko, dan definition of done

Asumsi default yang dipakai dokumen ini:

- Watchlist dan alert tersimpan per akun, dengan login email dan password.
- Alert dikirim lewat email. Telegram masuk fase berikutnya.
- Alert nonaktif setelah terpicu dan berlaku untuk kripto dan FX.
- Backend NestJS, frontend React dengan Chart.js, Redis Upstash, BullMQ, dan PostgreSQL.
- Durasi 10 hari kerja, dengan buffer pada hari 9 sampai 10.

| Risiko                                                | Dampak                          | Mitigasi                                                                                                  |
| ----------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Kuota CoinGecko free tier lebih kecil dari estimasi   | Error 429 saat pengguna ramai   | Satu request batch untuk semua koin. Cek kuota resmi sebelum uji beban. Siapkan CoinCap sebagai fallback. |
| Kebijakan CoinGecko mewajibkan API key                | Layanan berhenti                | API key opsional di env. Fallback CoinCap.                                                                |
| Frankfurter tidak memuat semua mata uang              | Pasangan tidak bisa ditampilkan | Hanya tampilkan mata uang yang didukung.                                                                  |
| Email terkirim tetapi aplikasi mati sebelum transaksi | Email ganda untuk satu alert    | Diterima untuk MVP. Dicatat pada bagian 5.                                                                |

Definition of done:

- [ ] README berisi deskripsi, GIF atau screenshot, diagram arsitektur, cara setup, dan link demo.
- [ ] `.env.example` tersedia dan tidak ada API key di repo.
- [ ] CI GitHub Actions menjalankan lint dan unit test di setiap push dan PR, dengan badge di README.
- [ ] Penanganan batas API: timeout, retry dengan backoff, cache, dan pesan error yang jelas.
- [ ] Dockerfile atau panduan deploy gratis.
- [ ] Lisensi MIT, `CHANGELOG.md`, dan rilis bertag `v1.0.0`.
