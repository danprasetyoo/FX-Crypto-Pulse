# docs/agents — Dokumentasi pengembangan

Folder ini berisi panduan teknis untuk pengembang dan agen AI. Titik masuknya adalah
[`AGENTS.md`](../../AGENTS.md) di root repo. Spesifikasi produk (PRD, FSD, Design System, Roadmap,
mockup UI) ada satu level di atas, di [`docs/`](../).

| Dokumen                            | Kapan dibaca                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | Sebelum menyentuh lebih dari satu layanan, atau mengubah cache/worker/gateway      |
| [conventions.md](conventions.md)   | Sebelum menulis kode baru di workspace mana pun                                    |
| [testing.md](testing.md)           | Sebelum menambah/menjalankan unit test, e2e, atau uji beban                        |
| [operations.md](operations.md)     | Saat mengubah env, Dockerfile, compose, workflow CI/CD, atau deploy                |
| [decisions.md](decisions.md)       | Saat kode tampak berbeda dari spesifikasi, atau sebelum mengambil keputusan desain |

## Cara menambah dokumen

- Satu topik per file, nama kebab-case, bahasa Indonesia untuk prosa, istilah teknis tetap Inggris.
- Tautkan dari `AGENTS.md` bila dokumen itu perlu dibaca di awal.
- Simpan keputusan dalam format ADR ringkas di `decisions.md` (konteks, keputusan, konsekuensi).
- Komentar panjang di kode cukup merujuk ke dokumen di sini, bukan menyalin isinya.
