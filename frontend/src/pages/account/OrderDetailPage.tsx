import CheckCircle from '@mui/icons-material/CheckCircle';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Link, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { orderApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Order, SellerOrder } from '../../types';
import { formatCurrency, formatDateTime, imageUrl } from '../../utils/format';
import { AddressBlock } from './AddressBlock';
import { ReturnDialog } from './ReturnDialog';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const placed = Boolean((useLocation().state as { placed?: boolean } | null)?.placed);
  const state = useAsync(() => orderApi.get(id), [id]);
  const { run, busy } = useAction();
  const [confirm, setConfirm] = useState(false);
  const [ret, setRet] = useState<SellerOrder | null>(null);

  return (
    <AsyncView state={state} loadingLabel="Loading order…">
      {(o) => {
        const cancellable =
          !['cancelled', 'delivered', 'refunded'].includes(o.orderStatus) &&
          o.sellerOrders.some((s) => ['pending', 'processing'].includes(s.fulfillmentStatus));
        return (
          <>
            {placed && (
              <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 2 }} data-testid="order-confirmation">
                <b>Thank you! Your order {o.orderNumber} has been placed.</b> We’ve created {o.sellerOrders.length} seller{' '}
                {o.sellerOrders.length === 1 ? 'order' : 'orders'} so each seller can ship their items independently.
              </Alert>
            )}
            <PageHeader
              title={`Order ${o.orderNumber}`}
              subtitle={`Placed ${formatDateTime(o.createdAt)}`}
              actions={
                <>
                  <StatusChip status={o.orderStatus} size="medium" />
                  <Chip label={`Payment: ${o.paymentStatus}`} variant="outlined" />
                  {cancellable && (
                    <Button color="error" variant="outlined" onClick={() => setConfirm(true)}>
                      Cancel order
                    </Button>
                  )}
                </>
              }
            />
            <Stack spacing={2}>
              {o.sellerOrders.map((so) => (
                <Card key={so._id} variant="outlined" data-testid="seller-order">
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>Shipment {so.orderNumber}</Typography>
                      <StatusChip status={so.fulfillmentStatus} />
                    </Stack>
                    {so.items.map((i) => (
                      <Stack key={i._id} direction="row" spacing={2} sx={{ py: 1, alignItems: 'center' }}>
                        <Box
                          component="img"
                          src={imageUrl(i.image)}
                          alt={i.name}
                          sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Link component={RouterLink} to={`/products/${i.product}`}>
                            {i.name}
                          </Link>
                          <Typography variant="body2" color="text.secondary">
                            {i.shopName} · {i.quantity} × {formatCurrency(i.unitPrice)}
                          </Typography>
                        </Box>
                        <Typography>{formatCurrency(i.lineTotal)}</Typography>
                      </Stack>
                    ))}
                    {so.trackingInformation?.trackingNumber && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Shipped via <b>{so.trackingInformation.carrier}</b> · Tracking #{so.trackingInformation.trackingNumber}
                        {so.trackingInformation.trackingUrl && (
                          <>
                            {' '}
                            ·{' '}
                            <Link href={so.trackingInformation.trackingUrl} target="_blank" rel="noopener noreferrer">
                              Track package
                            </Link>
                          </>
                        )}
                      </Alert>
                    )}
                    {so.fulfillmentStatus === 'delivered' && (
                      <Button sx={{ mt: 1 }} size="small" onClick={() => setRet(so)}>
                        Request return
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography gutterBottom sx={{ fontWeight: 700 }}>
                    Shipping address
                  </Typography>
                  <AddressBlock a={o.shippingAddressSnapshot} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography gutterBottom sx={{ fontWeight: 700 }}>
                    Payment summary
                  </Typography>
                  <Stack spacing={0.5}>
                    {(
                      [
                        ['Subtotal', o.subtotal],
                        ['Discount', -o.discount],
                        ['Shipping', o.shippingFee],
                        ['Tax', o.tax],
                      ] as const
                    ).map(([l, v]) => (
                      <Stack key={l} direction="row" sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="body2">{l}</Typography>
                        <Typography variant="body2">{formatCurrency(v)}</Typography>
                      </Stack>
                    ))}
                    <Divider />
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700 }}>Total</Typography>
                      <Typography data-testid="order-total" sx={{ fontWeight: 700 }}>
                        {formatCurrency(o.total)}
                      </Typography>
                    </Stack>
                    {o.refundedAmount > 0 && (
                      <Typography variant="body2" color="info.main">
                        Refunded (simulated): {formatCurrency(o.refundedAmount)}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Box>
            </Stack>
            <ConfirmDialog
              open={confirm}
              title="Cancel this order?"
              message="Items that haven't shipped will be cancelled, stock restored, and a simulated refund issued. Shipped items can't be cancelled."
              destructive
              confirmLabel="Cancel order"
              busy={busy}
              onClose={() => setConfirm(false)}
              onConfirm={async () => {
                if (await run(() => orderApi.cancel(o._id, 'Cancelled by buyer'), 'Cancellation processed')) {
                  setConfirm(false);
                  state.reload();
                }
              }}
            />
            <ReturnDialog order={o as Order} so={ret} onClose={() => setRet(null)} onDone={state.reload} />
          </>
        );
      }}
    </AsyncView>
  );
}
