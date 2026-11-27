import { Pagination as MuiPagination, Stack } from '@mui/material';
import type { Pagination } from '../types';

export function Pager({ pagination, onChange }: { pagination?: Pagination; onChange: (p: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <Stack sx={{ alignItems: 'center', mt: 3 }}>
      <MuiPagination
        count={pagination.totalPages}
        page={pagination.page}
        onChange={(_, p) => onChange(p)}
        color="primary"
        shape="rounded"
      />
    </Stack>
  );
}
