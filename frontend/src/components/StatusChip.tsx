import { Chip, type ChipProps } from '@mui/material';
import { titleCase } from '../utils/format';

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
