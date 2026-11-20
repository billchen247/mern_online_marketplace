import { Alert, Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import type { ReactNode } from 'react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Stack spacing={2} role="status" aria-live="polite" sx={{ alignItems: 'center', py: 8 }}>
      <CircularProgress aria-label={label} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" sx={{ my: 2 }} action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}>
      {message}
    </Alert>
  );
}
export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
      {icon ?? <InboxOutlined sx={{ fontSize: 56, opacity: 0.5 }} />}
      <Typography variant="h6" color="text.primary">{title}</Typography>
      {description && <Typography sx={{ maxWidth: 420 }}>{description}</Typography>}
      {action}
    </Stack>
  );
}
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i}>
          <Skeleton variant="rounded" height={190} />
          <Skeleton width="80%" />
          <Skeleton width="40%" />
        </Box>
      ))}
    </Box>
  );
}
/** Standard wrapper: shows loading / error / content. */
export function AsyncView<T>({ state, children, loadingLabel, allowNull }: { allowNull?: boolean; state: { data: T | null; loading: boolean; error: string | null; reload: () => void }; children: (d: T) => ReactNode; loadingLabel?: string }) {
  if (state.loading && !state.data) return <Loading label={loadingLabel} />;
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return allowNull && !state.loading ? <>{children(null as T)}</> : null;
  return <>{children(state.data)}</>;
}
