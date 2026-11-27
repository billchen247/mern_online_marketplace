import { Box, Skeleton } from '@mui/material';

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Box
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }}
      aria-busy="true"
    >
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
