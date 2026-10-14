import { RequireAuth } from '../components/RequireAuth';
import { WatchlistPanel } from '../components/WatchlistPanel';

export function WatchlistPage() {
  return (
    <RequireAuth>
      <div className="form-narrow">
        <WatchlistPanel asPage />
      </div>
    </RequireAuth>
  );
}
