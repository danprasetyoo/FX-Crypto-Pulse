import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

interface ToastApi {
  show(text: string, kind?: Kind): void;
  success(text: string): void;
  error(text: string): void;
}

const Ctx = createContext<ToastApi | null>(null);

/** Toast tampil 5 detik dan bisa ditutup (Design System bagian 4). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback(
    (id: number) => setItems((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback(
    (text: string, kind: Kind = 'info') => {
      const id = ++seq.current;
      setItems((prev) => [...prev, { id, kind, text }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ show, success: (t) => show(t, 'success'), error: (t) => show(t, 'error') }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role="status" data-testid="toast">
            <span>{t.text}</span>
            <button type="button" aria-label="Tutup" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
