import { Box, Card, CardContent, Chip, Pagination as MuiPagination, Stack, Typography, type ChipProps } from '@mui/material';
import type { ReactNode } from 'react';
import type { Pagination } from '../types';
import { titleCase } from '../utils/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}
    >
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

const STATUS_COLORS: Record<string, ChipProps['color']> = {
  active: 'success',
  paid: 'success',
  delivered: 'success',
  approved: 'success',
  published: 'success',
  completed: 'success',
  refunded: 'info',
  shipped: 'info',
  processing: 'info',
  requested: 'warning',
  pending: 'warning',
  partially_fulfilled: 'warning',
  partially_refunded: 'warning',
  draft: 'default',
  inactive: 'default',
  cancelled: 'error',
  rejected: 'error',
  suspended: 'error',
  blocked: 'error',
  failed: 'error',
  hidden: 'default',
};
export function StatusChip({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) {
  return (
    <Chip
      size={size}
      label={titleCase(status)}
      color={STATUS_COLORS[status] ?? 'default'}
      variant={STATUS_COLORS[status] ? 'filled' : 'outlined'}
    />
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" data-testid={`stat-${label.toLowerCase().replace(/\W+/g, '-')}`} sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
          {icon && <Box sx={{ color: 'primary.main', opacity: 0.8 }}>{icon}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

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

export const statGrid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } } as const;

/** Tiny dependency-free sales trend bar chart. */
export function TrendChart({ data, label = 'Revenue' }: { data: { date: string; revenue: number; orders: number }[]; label?: string }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <Box role="img" aria-label={`${label} trend, total ${total.toFixed(2)} dollars over ${data.length} days`}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-end', height: 140 }}>
        {data.map((d) => (
          <Box
            key={d.date}
            title={`${d.date}: $${d.revenue.toFixed(2)} (${d.orders} orders)`}
            sx={{
              flex: 1,
              bgcolor: d.revenue ? 'primary.main' : 'action.hover',
              borderRadius: 0.5,
              height: `${Math.max(3, (d.revenue / max) * 100)}%`,
              opacity: d.revenue ? 0.9 : 1,
            }}
          />
        ))}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {data[0]?.date}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data[data.length - 1]?.date}
        </Typography>
      </Stack>
    </Box>
  );
}
