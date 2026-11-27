import { Stack } from '@mui/material';
import type { ReactNode } from 'react';

export function Filters({ children }: { children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
      {children}
    </Stack>
  );
}
