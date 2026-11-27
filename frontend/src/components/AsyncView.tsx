import type { ReactNode } from 'react';

import { ErrorState } from './ErrorState';
import { Loading } from './Loading';

export function AsyncView<T>({
  state,
  children,
  loadingLabel,
  allowNull,
}: {
  allowNull?: boolean;
  state: { data: T | null; loading: boolean; error: string | null; reload: () => void };
  children: (d: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (state.loading && !state.data) return <Loading label={loadingLabel} />;
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return allowNull && !state.loading ? <>{children(null as T)}</> : null;
  return <>{children(state.data)}</>;
}
