import { AlertForm } from '../components/AlertForm';
import { RequireAuth } from '../components/RequireAuth';

export function NewAlertPage() {
  return (
    <RequireAuth>
      <AlertForm />
    </RequireAuth>
  );
}
