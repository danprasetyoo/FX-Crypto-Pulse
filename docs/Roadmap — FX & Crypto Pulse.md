# Roadmap — FX & Crypto Pulse

Oct 13, 2026 · @IT Dev

## 1. Ringkasan

Pengerjaan 10 hari kerja dimulai Senin 19 Oktober 2026 dan selesai Jumat 30 Oktober 2026. Rilis v1.0.0 dilakukan setelah observasi 48 jam tanpa error 429, sekitar Minggu 1 November 2026.

Catatan: target PRD "1,5 minggu" tidak cocok dengan 10 hari kerja, yang setara dua minggu kalender. Jadwal di dokumen ini memakai 10 hari kerja sesuai asumsi default.

## 2. Timeline

&#91;embedded content: jadwal dari Senin 19 Okt sampai Minggu 1 Nov 2026 · skala per hari kalender\]

Tahap berjalan berurutan. Setiap tahap ditutup dengan gerbang kualitas di bagian 4, dan rilis hanya dilakukan jika observasi 48 jam lolos.

## 3. Rincian per tahap

| Tahap     | Hari kerja     | Tanggal             | Pekerjaan                                                                           | Output                                                                 |
| --------- | -------------- | ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1         | 1 sampai 2     | 19 sampai 20 Okt    | Proxy API ke Frankfurter dan CoinGecko, caching Redis, timeout dan retry, unit test | Endpoint /api lulus test dan mengembalikan `stale` saat upstream gagal |
| 2         | 3 sampai 5     | 21 sampai 23 Okt    | Dashboard FX dan kripto, grafik 30, 90, dan 365 hari, konverter                     | UI tampil dengan label waktu data di setiap angka                      |
| 3         | 6 sampai 8     | 26 sampai 28 Okt    | Login, reset password, watchlist, form alert, worker BullMQ                         | Alert uji terkirim sekali dan status alert berubah menjadi terpicu     |
| 4         | 9 sampai 10    | 29 sampai 30 Okt    | Uji beban k6, Docker Compose, deploy, README, CHANGELOG, tag v1.0.0                 | Deploy live, hasil uji beban tercatat, README lengkap                  |
| Observasi | Sesudah deploy | 30 Okt sampai 1 Nov | Pantau log upstream                                                                 | Nol error 429 selama 48 jam                                            |

Rilis: tag `v1.0.0` dibuat setelah observasi lolos. Jika observasi gagal, rilis mundur sejak error 429 terakhir.

## 4. Gerbang kualitas

Tahap berikutnya hanya dimulai setelah semua kriteria gerbang terpenuhi.

Gerbang 1, akhir tahap 1 (20 Okt):

- [ ] Endpoint proxy lulus unit test
- [ ] Cache mengembalikan `stale: true` saat upstream dimatikan di staging

Gerbang 2, akhir tahap 2 (23 Okt):

- [ ] F1, F2, dan F3 tampil dengan label waktu data
- [ ] Konverter menghitung dengan data cache terbaru

Gerbang 3, akhir tahap 3 (28 Okt):

- [ ] Alert uji terkirim tepat sekali
- [ ] Watchlist dan alert hanya bisa diakses pengguna yang login

Gerbang rilis, 1 Nov:

- [ ] Hasil k6 memenuhi cache hit ratio 90% dan nol error 429 dalam 48 jam
- [ ] README, `.env.example`, CI hijau, dan lisensi MIT tersedia

## 5. Risiko jadwal dan buffer

| Risiko                               | Dampak                                  | Tindakan                                                                            |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Tahap 3 lebih lama dari dua hari     | Uji beban dan deploy terdesak           | Potong fitur F6 (ekspor CSV) lebih dulu. Auth tetap masuk.                          |
| Uji beban menemukan bottleneck       | Perlu perbaikan cache di hari 9         | Tidak ada buffer tambahan. Jika perbaikan butuh lebih dari satu hari, rilis mundur. |
| Kuota CoinGecko habis saat observasi | Observasi harus diulang 48 jam          | Cek kuota sebelum tahap 1 selesai, bukan saat deploy.                               |
| Pengerjaan dilakukan satu orang      | Tidak ada cadangan jika sakit atau cuti | Owner dan cadangan ditetapkan sebelum 19 Okt.                                       |

Buffer: hari 9 dan 10 sudah dipakai untuk uji beban dan deploy, jadi tidak ada cadangan tambahan. Observasi 48 jam berjalan di luar hari kerja.

## 6. Asumsi yang perlu dikonfirmasi

- Mulai kerja Senin 19 Oktober 2026. Jika mulai lebih lambat, seluruh tanggal bergeser dengan jumlah hari yang sama.
- Dikerjakan satu orang. Jika ada dua orang, tahap 2 dan 3 bisa paralel dan jadwal lebih pendek.
- Hari libur nasional belum dikurangkan. Jika ada hari libur di 19 Okt sampai 30 Okt, tambahkan satu hari per libur.
- Pengukuran 429 memakai akun dan kuota yang sama dengan production.
