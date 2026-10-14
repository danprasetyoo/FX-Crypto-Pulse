# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/)
dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [1.0.0] - 2026-10-13

### Ditambahkan

- market-service: proxy Frankfurter (ECB) dan CoinGecko dengan cache Redis (60 dtk harga, 1 jam
  histori dan kurs), single-flight, retry backoff, fallback stale, cooldown 429, metrik cache.
- Endpoint `/api/fx/latest`, `/api/fx/history`, `/api/fx/currencies`, `/api/crypto/top`,
  `/api/crypto/history`, `/api/convert`, `/api/market/metrics`, `/api/health`.
- user-service: registrasi/login/logout dengan JWT di cookie httpOnly 7 hari, reset password via
  email, watchlist per akun, alert harga (di atas/di bawah, IDR/USD), migrasi skema otomatis.
- alert-worker: evaluasi alert tiap 5 menit (BullMQ), email tepat sekali per aktivasi.
- web: dashboard kurs dan top-20 kripto dengan label waktu data, grafik 30/90/365 hari, tabel data
  dan ekspor CSV, konverter, watchlist, form dan daftar alert, mode gelap, layout mobile dengan tab.
- gateway nginx, Docker Compose (dev, e2e, prod), Dockerfile multi-stage.
- Pengujian: unit (Jest/Vitest), e2e Playwright (desktop + mobile) dengan mock upstream dan
  Mailpit, skrip uji beban k6.
- CI/CD GitHub Actions: lint/test/build/e2e, rilis image ke GHCR, deploy via SSH.
- Dokumentasi: `AGENTS.md`, `docs/agents/*`, README, `.env.example`.

[Unreleased]: https://github.com/danprasetyoo/FX-Crypto-Pulse/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/danprasetyoo/FX-Crypto-Pulse/releases/tag/v1.0.0
