import { useCallback, useState } from 'react';
import { useNotify } from '../contexts/NotifyContext';
import { getErrorMessage } from '../utils/errors';

/** Wraps an async mutation with busy state and toast error handling. Returns undefined on failure. */
export function useAction() {
  const { success, error } = useNotify();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (successMessage) success(successMessage);
        return r;
      } catch (e) {
        error(getErrorMessage(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [success, error],
  );
  return { busy, run };
}
