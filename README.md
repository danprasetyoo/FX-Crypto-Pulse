# FX & Crypto Pulse

Dashboard kurs mata uang (referensi ECB via Frankfurter) dan harga kripto (CoinGecko) dengan grafik
historis, konverter, watchlist per akun, dan alert harga via email. Data hanya informasi, bukan saran
investasi.

Repositori ini sedang dibangun bertahap. Spesifikasi produk ada di [`docs/`](docs/); panduan
pengembangan untuk manusia dan agen AI ada di [`AGENTS.md`](AGENTS.md) dan [`docs/agents/`](docs/agents/).

```bash
npm ci
npm run lint && npm run typecheck && npm test && npm run build
```
