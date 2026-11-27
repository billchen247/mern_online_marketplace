import { Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { AddressBlock } from '../account/AddressBlock';
import { TrackingDialog } from './TrackingDialog';

export function SellerOrderDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => sellerApi.order(id), [id]);
  const { run, busy } = useAction();
  const [dlg, setDlg] = useState<'ship' | 'track' | null>(null);
  const [cancel, setCancel] = useState(false);
  const labels: Record<string, string> = {
    processing: 'Accept & start processing',
    shipped: 'Mark as shipped',
    delivered: 'Mark as delivered',
    cancelled: 'Cancel items',
  };
  return (
    <AsyncView state={state}>
      {(o) => (
        <>
          <PageHeader
            title={`Order ${o.orderNumber}`}
            subtitle={`Part of ${o.parentOrderNumber} · ${formatDateTime(o.createdAt)}`}
            actions={<StatusChip status={o.fulfillmentStatus} size="medium" />}
          />
          {o.cancellationRequested && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The buyer has requested cancellation.
            </Alert>
          )}
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {o.items.map((i) => (
                    <TableRow key={i._id}>
                      <TableCell>
                        {i.name}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {i.sku}
                        </Typography>
                      </TableCell>
                      <TableCell>{i.shopName}</TableCell>
                      <TableCell align="right">{i.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(i.unitPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(i.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 700 }}>
                  Ship to
                </Typography>
                {o.shippingAddress && <AddressBlock a={o.shippingAddress} />}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Buyer: {typeof o.buyer === 'object' ? `${o.buyer.name}${o.buyer.email ? ` (${o.buyer.email})` : ''}` : ''}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 700 }}>
                  Financials <Chip size="small" label="simulated" />
                </Typography>
                {(
                  [
                    ['Subtotal', o.subtotal],
                    ['Shipping', o.shippingFee],
                    ['Tax', o.tax],
                    [`Commission (${o.commissionRate}%)`, -o.commission],
                    ['Your earnings', o.sellerEarnings],
                  ] as const
                ).map(([l, v]) => (
                  <Stack key={l} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">{l}</Typography>
                    <Typography variant="body2">{formatCurrency(v)}</Typography>
                  </Stack>
                ))}
              </Paper>
            </Box>
            {o.trackingInformation?.trackingNumber && (
              <Alert severity="info">
                {o.trackingInformation.carrier} · #{o.trackingInformation.trackingNumber}
              </Alert>
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {o.allowedTransitions
                ?.filter((s) => s !== 'cancelled')
                .map((s) => (
                  <Button
                    key={s}
                    variant="contained"
                    disabled={busy}
                    onClick={() =>
                      s === 'shipped'
                        ? setDlg('ship')
                        : run(() => sellerApi.updateOrderStatus(o._id, { status: s }), 'Order updated').then((r) => r && state.reload())
                    }
                  >
                    {labels[s] ?? s}
                  </Button>
                ))}
              {['shipped'].includes(o.fulfillmentStatus) && (
                <Button variant="outlined" onClick={() => setDlg('track')}>
                  Update tracking
                </Button>
              )}
              {o.allowedTransitions?.includes('cancelled') && (
                <Button color="error" variant="outlined" onClick={() => setCancel(true)}>
                  Cancel items
                </Button>
              )}
            </Stack>
          </Stack>
          <TrackingDialog order={o} open={dlg !== null} markShipped={dlg === 'ship'} onClose={() => setDlg(null)} onDone={state.reload} />
          <ConfirmDialog
            open={cancel}
            title="Cancel this order?"
            message="Stock is restored and the buyer is refunded (simulated)."
            destructive
            confirmLabel="Cancel items"
            busy={busy}
            onClose={() => setCancel(false)}
            onConfirm={async () => {
              if (await run(() => sellerApi.updateOrderStatus(o._id, { status: 'cancelled' }), 'Order cancelled')) {
                setCancel(false);
                state.reload();
              }
            }}
          />
        </>
      )}
    </AsyncView>
  );
}
