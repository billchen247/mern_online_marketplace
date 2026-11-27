import { CircularProgress, Stack, Typography } from '@mui/material';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Stack spacing={2} role="status" aria-live="polite" sx={{ alignItems: 'center', py: 8 }}>
      <CircularProgress aria-label={label} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
