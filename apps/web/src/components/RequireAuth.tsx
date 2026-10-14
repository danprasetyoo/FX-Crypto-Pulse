import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMe } from '../lib/queries';
import { SkeletonBlock } from './States';

/** Watchlist dan alert hanya untuk pengguna terdaftar (FSD bagian 2). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const loc = useLocation();
  if (me.isLoading) return <SkeletonBlock height={120} />;
  if (!me.data)
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}
