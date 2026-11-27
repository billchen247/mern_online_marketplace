import { Divider, Stack, Typography } from '@mui/material';
import type { Cart } from '../../types';
import { formatCurrency } from '../../utils/format';

export function SummaryRows({ s, free }: { s: Cart['summary']; free?: number }) {
  const row = (label: string, value: string, bold = false, color?: string) => (
    <Stack direction="row" sx={{ justifyContent: 'space-between', fontWeight: bold ? 700 : 400, color }}>
      <Typography color="inherit" sx={{ fontWeight: 'inherit' }}>
        {label}
      </Typography>
      <Typography color="inherit" data-testid={`sum-${label.toLowerCase().replace(/\W+/g, '-')}`} sx={{ fontWeight: 'inherit' }}>
        {value}
      </Typography>
    </Stack>
  );
  return (
    <Stack spacing={1}>
      {row(`Subtotal (${s.itemCount} items)`, formatCurrency(s.subtotal))}
      {s.discount > 0 &&
        row(`Discount${s.couponCode ? ` (${s.couponCode})` : ''}`, `-${formatCurrency(s.discount)}`, false, 'success.main')}
      {row(
        `Estimated shipping${s.sellerCount > 1 ? ` (${s.sellerCount} sellers)` : ''}`,
        s.shippingFee === 0 ? 'Free' : formatCurrency(s.shippingFee),
      )}
      {row('Estimated tax', formatCurrency(s.tax))}
      <Divider />
      {row('Total', formatCurrency(s.total), true)}
      {free !== undefined && (
        <Typography variant="caption" color="text.secondary">
          Free shipping applies per seller on orders over {formatCurrency(free)}. Final amounts are calculated by the server at checkout.
        </Typography>
      )}
    </Stack>
  );
}
