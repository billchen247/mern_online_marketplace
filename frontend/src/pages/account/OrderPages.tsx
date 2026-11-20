import { zodResolver } from '@hookform/resolvers/zod';
import CheckCircle from '@mui/icons-material/CheckCircle';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { orderApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { Pager, PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Order, SellerOrder } from '../../types';
import { formatCurrency, formatDateTime, imageUrl } from '../../utils/format';
import { returnFormSchema } from '../../validation/schemas';
import { AddressBlock } from './CheckoutPage';

export function OrderListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const state = useAsync(() => orderApi.list(page, status || undefined), [page, status]);
  return (
    <>
      <PageHeader
        title="My orders"
        actions={
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_fulfilled', 'refunded'].map((s) => (
              <MenuItem key={s} value={s}>
                {s.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState
              title="No orders yet"
              action={
                <Button component={RouterLink} to="/products" variant="contained">
                  Start shopping
                </Button>
              }
            />
          ) : (
            <Stack spacing={1.5}>
              {r.data.map((o) => (
                <Card key={o._id} variant="outlined" data-testid="order-row">
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                      <Box>
                        <Link component={RouterLink} to={`/account/orders/${o._id}`} sx={{ fontWeight: 700 }}>
                          {o.orderNumber}
                        </Link>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(o.createdAt)} · {o.itemCount ?? 0} items
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                          {o.preview?.map((p, i) => (
                            <Box
                              key={i}
                              component="img"
                              src={imageUrl(p.image)}
                              alt={p.name}
                              title={p.name}
                              sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 0.5 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Stack spacing={0.5} sx={{ alignItems: { sm: 'flex-end' } }}>
                        <StatusChip status={o.orderStatus} />
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrency(o.total)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              <Pager pagination={r.pagination} onChange={setPage} />
            </Stack>
          )
        }
      </AsyncView>
    </>
  );
}

function ReturnDialog({ order, so, onClose, onDone }: { order: Order; so: SellerOrder | null; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [sel, setSel] = useState<Record<string, number>>({});
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ reason: string }>({ resolver: zodResolver(returnFormSchema) });
  if (!so) return null;
  const submit = handleSubmit(async ({ reason }) => {
    const items = Object.entries(sel)
      .filter(([, q]) => q > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    if (items.length === 0) return;
    if (await run(() => orderApi.requestReturn(order._id, { sellerOrderId: so._id, items, reason }), 'Return requested')) {
      onDone();
      onClose();
    }
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="ret-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="ret-title">Request a return · {so.orderNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {so.items.map((i) => {
              const max = i.quantity - (i.returnedQuantity ?? 0);
              return (
                <Stack key={i._id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <FormControlLabel
                    disabled={max <= 0}
                    control={
                      <Checkbox checked={(sel[i._id] ?? 0) > 0} onChange={(e) => setSel({ ...sel, [i._id]: e.target.checked ? max : 0 })} />
                    }
                    label={`${i.name} (max ${max})`}
                  />
                  {(sel[i._id] ?? 0) > 0 && (
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      value={sel[i._id]}
                      slotProps={{ htmlInput: { min: 1, max, 'aria-label': `Return quantity for ${i.name}` } }}
                      onChange={(e) => setSel({ ...sel, [i._id]: Math.min(max, Math.max(1, Number(e.target.value))) })}
                    />
                  )}
                </Stack>
              );
            })}
            <TextField
              label="Reason for return"
              multiline
              minRows={3}
              {...register('reason')}
              error={Boolean(errors.reason)}
              helperText={errors.reason?.message}
            />
            {Object.values(sel).every((q) => !q) && (
              <Typography variant="caption" color="text.secondary">
                Select at least one item.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Submit request
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

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

export function ReturnsPage() {
  const state = useAsync(() => orderApi.returns(), []);
  return (
    <>
      <PageHeader title="Return requests" />
      <AsyncView state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState title="No return requests" description="You can request a return from a delivered order." />
          ) : (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Requested</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Refund</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell>{typeof r.order === 'object' ? r.order.orderNumber : ''}</TableCell>
                      <TableCell>{r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell>
                        <StatusChip status={r.status} />
                      </TableCell>
                      <TableCell align="right">{r.status === 'refunded' ? `${formatCurrency(r.refundAmount)} (simulated)` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        }
      </AsyncView>
    </>
  );
}
