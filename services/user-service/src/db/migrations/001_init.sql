-- Skema awal FX & Crypto Pulse (FSD bagian 5).
-- Cache harga/kurs TIDAK disimpan di sini (hanya di Redis).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Email dinormalisasi ke huruf kecil oleh aplikasi sebelum disimpan.
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('fx', 'crypto')),
  asset_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, asset_code)
);

CREATE TABLE IF NOT EXISTS alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('fx', 'crypto')),
  asset_code   text NOT NULL,
  condition    text NOT NULL CHECK (condition IN ('above', 'below')),
  target       numeric(30, 10) NOT NULL CHECK (target > 0),
  currency     text NOT NULL,
  -- active = aktif, triggered = terpicu, inactive = nonaktif
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'inactive')),
  -- Bertambah setiap kali pengguna mengaktifkan kembali alert; dipakai untuk
  -- menjamin tepat satu notifikasi per aktivasi (lihat notifications).
  activation   integer NOT NULL DEFAULT 1,
  triggered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_active_idx ON alerts (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS alerts_user_idx ON alerts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id   uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  activation integer NOT NULL,
  channel    text NOT NULL CHECK (channel IN ('email', 'telegram')),
  status     text NOT NULL CHECK (status IN ('sent', 'failed')),
  -- Harga saat alert terpicu, untuk audit.
  price      numeric(30, 10),
  sent_at    timestamptz NOT NULL DEFAULT now(),
  -- Unik per (alert, aktivasi): satu notifikasi per alert per aktivasi.
  UNIQUE (alert_id, activation)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
