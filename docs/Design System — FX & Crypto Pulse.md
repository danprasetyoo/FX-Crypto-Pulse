# Design System — FX & Crypto Pulse

Oct 13, 2026 · @IT Dev

Dokumen ini menetapkan token dan komponen untuk dashboard FX & Crypto Pulse. Semua nilai dalam bentuk token agar mudah diubah tanpa mengedit setiap komponen.

## 1. Prinsip desain

Dashboard ini menampilkan angka, jadi kejelasan lebih penting daripada dekorasi. Tiga prinsip utama:

1. **Setiap angka punya waktu.** Harga dan kurs selalu disertai label waktu. Kurs FX menampilkan tanggal data ECB, bukan jam real-time.
2. **Netral seperti laporan.** Tidak ada warna atau bahasa yang terdengar seperti rekomendasi beli atau jual. Disclaimer tampil di footer setiap halaman harga.
3. **Warna tidak sendirian.** Kenaikan dan penurunan selalu memakai tanda (+ atau -) dan panah, tidak hanya warna hijau dan merah.

## 2. Warna

Semua warna didefinisikan sebagai token CSS di `:root`. Mode gelap memakai nilai kedua di bawah.

| Token                          | Terang                             | Gelap                              | Pemakaian                                   |
| ------------------------------ | ---------------------------------- | ---------------------------------- | ------------------------------------------- |
| `--bg`                         | #FFFFFF                            | #0F1115                            | Latar halaman                               |
| `--surface`                    | #F7F8FA                            | #171A21                            | Kartu dan panel                             |
| `--border`                     | #E5E7EB                            | #2A2F3A                            | Garis pemisah dan batas input               |
| `--text`                       | #111827                            | #F3F4F6                            | Teks utama dan angka harga                  |
| `--text-muted`                 | #4B5563                            | #9CA3AF                            | Label, waktu data, dan catatan              |
| `--accent`                     | #1D4ED8                            | #60A5FA                            | Tombol utama, fokus, dan grafik aktif       |
| `--up`                         | #15803D                            | #4ADE80                            | Perubahan positif, dengan tanda + dan panah |
| `--down`                       | #B91C1C                            | #F87171                            | Perubahan negatif, dengan tanda - dan panah |
| `--warn`                       | #B45309                            | #FBBF24                            | Data cache yang sudah lewat batas (`stale`) |
| `--chart-1` sampai `--chart-4` | #1D4ED8, #0F766E, #B45309, #7C3AED | #60A5FA, #2DD4BF, #FBBF24, #A78BFA | Seri grafik, dipakai berurutan              |

Kontras: teks utama dan teks muted memenuhi WCAG AA (minimal 4,5:1) di kedua mode. Warna grafik memenuhi 3:1 untuk garis dan area.

## 3. Tipografi dan spacing

Font utama Inter, dengan fallback system-ui. Angka harga memakai `font-variant-numeric: tabular-nums` agar kolom tidak bergeser saat nilai berubah.

| Token       | Ukuran dan tinggi baris | Bobot       | Pemakaian                      |
| ----------- | ----------------------- | ----------- | ------------------------------ |
| `--text-xs` | 12 px / 16 px           | 400         | Label waktu data, catatan kaki |
| `--text-sm` | 14 px / 20 px           | 400 dan 500 | Teks tabel dan label form      |
| `--text-md` | 16 px / 24 px           | 400         | Teks badan                     |
| `--text-lg` | 20 px / 28 px           | 600         | Judul kartu dan nilai kurs     |
| `--text-xl` | 32 px / 40 px           | 600         | Nilai utama di header          |

Skala spacing berbasis 4 px: 4, 8, 12, 16, 24, 32, dan 48 px. Radius kartu 8 px, radius input dan tombol 6 px. Batas sebesar 1 px memakai `--border`.

## 4. Komponen

| Komponen        | Fitur     | Varian                                      | Status yang harus ditangani             |
| --------------- | --------- | ------------------------------------------- | --------------------------------------- |
| Kartu kurs      | F1        | Default, dengan tombol hapus dari watchlist | Memuat, normal, stale, tidak didukung   |
| Baris kripto    | F2        | Standar dan ringkas (mobile)                | Memuat, normal, stale                   |
| Pemilih rentang | F3        | Segmented: 30, 90, 365 hari                 | Aktif, nonaktif, memuat                 |
| Form alert      | F4        | Kondisi di atas atau di bawah, input target | Valid, error validasi, tersimpan        |
| Item watchlist  | F4 dan F2 | Dengan badge alert aktif                    | Aktif, terpicu, nonaktif                |
| Konverter       | F5        | Dua input dan dua pilihan aset              | Memuat, hasil, error nominal            |
| Tombol          | Semua     | Utama, sekunder, ghost, destruktif          | Default, hover, fokus, disabled, memuat |
| Badge data      | Semua     | Waktu data, stale, sumber ECB               | Live, cache, stale                      |
| Toast           | Semua     | Sukses, error, info                         | Tampil 5 detik, bisa ditutup            |

Aturan tombol destruktif (hapus alert): selalu memakai dialog konfirmasi.

## 5. Layout dashboard

Urutan area sama di desktop dan mobile. Di desktop, area berjalan berdampingan. Di mobile, area bertumpuk dari atas ke bawah.

| Area                     | Desktop (1280 px ke atas)                     | Mobile (di bawah 768 px)         |
| ------------------------ | --------------------------------------------- | -------------------------------- |
| Header                   | Logo, pencarian aset, dan status data terbaru | Logo dan tombol menu             |
| Kurs FX (F1)             | Kolom kiri, lebar 400 px                      | Urutan pertama, kartu penuh      |
| Harga kripto (F2)        | Kolom kanan, tabel top-20                     | Urutan kedua, baris ringkas      |
| Grafik (F3)              | Baris penuh di bawah kedua kolom              | Urutan ketiga, tinggi 240 px     |
| Watchlist dan alert (F4) | Panel samping, lebar 320 px                   | Tab terpisah                     |
| Konverter (F5)           | Panel samping di bawah watchlist              | Tab terpisah                     |
| Footer                   | Disclaimer dan tanggal pembaruan              | Disclaimer dan tanggal pembaruan |

Lebar konten maksimal 1280 px. Margin samping 16 px di mobile dan 24 px di desktop.

## 6. Grafik

Grafik memakai Chart.js. Warna seri mengikuti `--chart-1` sampai `--chart-4`.

- Sumbu Y dimulai dari nilai minimum data, bukan nol, untuk kurs FX. Label sumbu memakai satuan, misalnya IDR atau USD.
- Tooltip menampilkan tanggal dan nilai lengkap. Untuk kurs FX, tooltip juga menyebut bahwa data adalah kurs referensi ECB.
- Setiap grafik punya teks alternatif yang menyebut rentang, nilai awal, nilai akhir, dan perubahan persen.
- Tabel data tersembunyi tersedia lewat tombol "Lihat data". Tombol ini juga memenuhi kebutuhan ekspor CSV (F6).
- Grafik tidak memakai animasi lebih dari 300 ms. Pengguna dengan preferensi `prefers-reduced-motion` tidak melihat animasi sama sekali.

## 7. Status dan pesan

| Status                             | Tampilan                                                  | Teks pengguna                                            |
| ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Memuat                             | Skeleton pada baris atau kartu, tanpa spinner penuh layar | -                                                        |
| Normal                             | Nilai dengan badge waktu data                             | "Diperbarui 14:05 WIB" atau "Kurs ECB per 10 Okt 2026"   |
| Data cache (stale)                 | Badge warna `--warn` dengan ikon jam                      | "Data terakhir 14:05 WIB. Sumber sedang tidak tersedia." |
| Error (upstream down, tanpa cache) | Kartu dengan ikon peringatan dan tombol coba lagi         | "Data belum tersedia. Coba lagi beberapa saat."          |
| Kosong (watchlist belum ada isi)   | Ilustrasi sederhana dan tombol tambah aset                | "Belum ada aset di watchlist."                           |
| Rate limit (429 ditangani backend) | Sama dengan stale. Pengguna tidak melihat kata 429.       | Sama dengan stale                                        |

Pesan error tidak boleh menyebut nama API atau kode teknis kepada pengguna. Detail teknis hanya masuk ke log.
