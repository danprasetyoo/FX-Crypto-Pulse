import type { ApiEnvelope } from '@fxpulse/shared';
import type { Resolved } from '../cache/cache.service';

/** Membungkus hasil cache menjadi format respons standar (FSD bagian 6). */
export function envelope<T>(resolved: Resolved<T>): ApiEnvelope<T> {
  return {
    data: resolved.value,
    updatedAt: resolved.updatedAt,
    source: resolved.source,
    stale: resolved.stale,
  };
}

/** Menggabungkan beberapa hasil: updatedAt paling lama, stale jika ada yang stale. */
export function combine<T>(parts: Resolved<unknown>[], value: T): ApiEnvelope<T> {
  const oldest = parts.reduce(
    (min, p) => (p.updatedAt < min ? p.updatedAt : min),
    parts[0]?.updatedAt ?? new Date().toISOString(),
  );
  return {
    data: value,
    updatedAt: oldest,
    source: parts.every((p) => p.source === 'live') ? 'live' : 'cache',
    stale: parts.some((p) => p.stale),
  };
}
