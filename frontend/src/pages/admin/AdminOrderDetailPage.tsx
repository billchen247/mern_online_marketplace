import { Button, Paper, Stack, Typography } from '@mui/material';
import { name } from './AdminShared';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => adminApi.order(id), [id]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<string | null>(null);
  return (
    <AsyncView state={state}>
      {(o) => (
        <>
          <PageHeader
            title={`Order ${o.orderNumber}`}
            subtitle={`${formatDateTime(o.createdAt)} · ${name(o.buyer)}`}
            actions={<StatusChip status={o.orderStatus} size="medium" />}
          />
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {(
                [
                  ['Subtotal', o.subtotal],
                  ['Shipping', o.shippingFee],
                  ['Tax', o.tax],
                  ['Discount', -o.discount],
                  ['Total', o.total],
                  ['Refunded', o.refundedAmount],
                ] as const
              ).map(([l, v]) => (
                <Stack key={l} direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2">{l}</Typography>
                  <Typography variant="body2">{formatCurrency(v)}</Typography>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Payment: {o.paymentMethod} · {o.paymentStatus} (simulated)
              </Typography>
            </Paper>
            {o.sellerOrders.map((so) => (
              <Paper key={so._id} variant="outlined" sx={{ p: 2 }} data-testid="admin-seller-order">
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {so.orderNumber} · {name(so.seller)}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip status={so.fulfillmentStatus} />
                    {!['delivered', 'cancelled'].includes(so.fulfillmentStatus) && (
                      <Button size="small" color="error" onClick={() => setTarget(so._id)}>
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Stack>
                {so.items.map((i) => (
                  <Stack key={i._id} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {i.quantity} × {i.name}
                    </Typography>
                    <Typography variant="body2">{formatCurrency(i.lineTotal)}</Typography>
                  </Stack>
                ))}
                <Typography variant="caption" color="text.secondary">
                  Commission {formatCurrency(so.commission)} · Seller earnings {formatCurrency(so.sellerEarnings)}
                </Typography>
              </Paper>
            ))}
          </Stack>
          <ConfirmDialog
            open={Boolean(target)}
            title="Cancel seller order?"
            message="Stock is restored and the amount is refunded (simulated)."
            destructive
            confirmLabel="Cancel order"
            busy={busy}
            onClose={() => setTarget(null)}
            onConfirm={async () => {
              if (target && (await run(() => adminApi.cancelSellerOrder(target, 'Cancelled by admin'), 'Seller order cancelled'))) {
                setTarget(null);
                state.reload();
              }
            }}
          />
        </>
      )}
    </AsyncView>
  );
}
