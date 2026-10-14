import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_FX_BASE,
  DEFAULT_FX_QUOTES,
  type CreateAlertInput,
  type CreateWatchlistItemInput,
  type HistoryRange,
  type UpdateAlertInput,
} from '@fxpulse/shared';
import { api, ApiClientError } from './api';

/** Kunci query terpusat agar invalidasi konsisten. */
export const keys = {
  fxLatest: (base: string, quotes: string[]) => ['fx', 'latest', base, quotes.join(',')] as const,
  fxHistory: (pair: string, range: number) => ['fx', 'history', pair, range] as const,
  fxCurrencies: ['fx', 'currencies'] as const,
  cryptoTop: ['crypto', 'top'] as const,
  cryptoHistory: (id: string, vs: string, range: number) =>
    ['crypto', 'history', id, vs, range] as const,
  convert: (from: string, to: string, amount: number) => ['convert', from, to, amount] as const,
  me: ['auth', 'me'] as const,
  watchlist: ['watchlist'] as const,
  alerts: ['alerts'] as const,
};

export function useFxLatest(base = DEFAULT_FX_BASE, quotes: string[] = [...DEFAULT_FX_QUOTES]) {
  return useQuery({
    queryKey: keys.fxLatest(base, quotes),
    queryFn: () => api.fxLatest(base, quotes),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useFxCurrencies() {
  return useQuery({
    queryKey: keys.fxCurrencies,
    queryFn: api.fxCurrencies,
    staleTime: 24 * 3600_000,
  });
}

export function useCryptoTop() {
  return useQuery({
    queryKey: keys.cryptoTop,
    queryFn: () => api.cryptoTop(['idr', 'usd']),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useFxHistory(pair: string, range: HistoryRange, enabled = true) {
  return useQuery({
    queryKey: keys.fxHistory(pair, range),
    queryFn: () => api.fxHistory(pair, range),
    staleTime: 10 * 60_000,
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCryptoHistory(id: string, vs: string, range: HistoryRange, enabled = true) {
  return useQuery({
    queryKey: keys.cryptoHistory(id, vs, range),
    queryFn: () => api.cryptoHistory(id, vs, range),
    staleTime: 10 * 60_000,
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useConvert(from: string, to: string, amount: number) {
  return useQuery({
    queryKey: keys.convert(from, to, amount),
    queryFn: () => api.convert(from, to, amount),
    enabled: Boolean(from && to) && Number.isFinite(amount) && amount >= 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: (count, err) => !(err instanceof ApiClientError && err.statusCode < 500) && count < 2,
  });
}

// ---- Auth ----

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return (await api.me()).user;
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.setQueryData(keys.me, null);
      qc.removeQueries({ queryKey: keys.watchlist });
      qc.removeQueries({ queryKey: keys.alerts });
    },
  });
}

// ---- Watchlist ----

export function useWatchlist(enabled: boolean) {
  return useQuery({ queryKey: keys.watchlist, queryFn: api.watchlist, enabled, staleTime: 60_000 });
}

export function useAddWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWatchlistItemInput) => api.addWatchlist(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  });
}

export function useRemoveWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeWatchlist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  });
}

// ---- Alerts ----

export function useAlerts(enabled: boolean) {
  return useQuery({
    queryKey: keys.alerts,
    queryFn: api.alerts,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput) => api.createAlert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAlertInput }) =>
      api.updateAlert(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useRemoveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}
