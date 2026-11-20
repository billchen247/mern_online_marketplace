import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Severity = 'success' | 'error' | 'info' | 'warning';
interface NotifyApi {
  notify: (message: string, severity?: Severity) => void;
  success: (m: string) => void;
  error: (m: string) => void;
}
const Ctx = createContext<NotifyApi | null>(null);

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; severity: Severity; key: number } | null>(null);
  const notify = useCallback((message: string, severity: Severity = 'info') => setToast({ message, severity, key: Date.now() }), []);
  const api = useMemo<NotifyApi>(() => ({ notify, success: (m) => notify(m, 'success'), error: (m) => notify(m, 'error') }), [notify]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} role="status" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Ctx.Provider>
  );
}
export function useNotify(): NotifyApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNotify must be used within NotifyProvider');
  return c;
}
