import { zodResolver } from '@hookform/resolvers/zod';
import Add from '@mui/icons-material/Add';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormText } from '../../components/FormFields';
import { ImageUploader } from '../../components/ImageUploader';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatCard, StatusChip, TrendChart, statGrid } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { ImageRef, SellerOrder } from '../../types';
import { formatCurrency, formatDateTime, imageUrl } from '../../utils/format';
import { shopSchema, trackingSchema } from '../../validation/schemas';
import { AddressBlock } from '../account/CheckoutPage';

export function SellerDashboardPage() {
  const state = useAsync(() => sellerApi.dashboard(), []);
  return (
    <>
      <PageHeader title="Seller dashboard" subtitle="Figures are calculated from your own shops’ orders." />
      <AsyncView state={state}>
        {(d) => (
          <Stack spacing={3}>
            <Box sx={statGrid}>
              <StatCard label="Total sales" value={formatCurrency(d.totalSales)} />
              <StatCard label="Orders" value={d.orderCount} />
              <StatCard label="Products" value={d.productCount} />
              <StatCard label="Shops" value={d.shopCount} />
              <StatCard label="Pending orders" value={d.pendingOrders} />
              <StatCard label="Completed orders" value={d.completedOrders} />
              <StatCard label="Low-stock products" value={d.lowStockProducts.length} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Sales — last 14 days</Typography><TrendChart data={d.salesTrend} /></Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Recent orders</Typography>
                {d.recentOrders.length === 0 ? <Typography color="text.secondary">No orders yet.</Typography> : d.recentOrders.map((o) => (
                  <Stack key={o._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}><Link component={RouterLink} to={`/seller/orders/${o._id}`}>{o.orderNumber}</Link><StatusChip status={o.fulfillmentStatus} /><Typography variant="body2">{formatCurrency(o.subtotal)}</Typography></Stack>
                ))}
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Low stock</Typography>
                {d.lowStockProducts.length === 0 ? <Typography color="text.secondary">All products are well stocked.</Typography> : d.lowStockProducts.map((p) => (
                  <Stack key={p._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}><Link component={RouterLink} to={`/seller/products/${p._id}`}>{p.name}</Link><Chip size="small" color={p.stock === 0 ? 'error' : 'warning'} label={p.stock === 0 ? 'Out of stock' : `${p.stock} left`} /></Stack>
                ))}
              </Paper>
            </Box>
          </Stack>
        )}
      </AsyncView>
    </>
  );
}

// ---------- Shops ----------
export function SellerShopsPage() {
  const state = useAsync(() => sellerApi.shops(), []);
  const { run, busy } = useAction();
  const [del, setDel] = useState<{ _id: string; name: string } | null>(null);
  return (
    <>
      <PageHeader title="My shops" actions={<Button component={RouterLink} to="/seller/shops/new" variant="contained" startIcon={<Add />}>Create shop</Button>} />
      <AsyncView state={state}>
        {(shops) => shops.length === 0 ? <EmptyState title="You have no shops yet" description="Create your first shop to start listing products." /> : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {shops.map((s) => (
              <Card key={s._id} variant="outlined" data-testid="shop-card"><CardContent>
                <Stack direction="row" spacing={2}>
                  <Box component="img" src={imageUrl(s.logo?.url)} alt="" sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap sx={{ fontWeight: 700 }}>{s.name}</Typography><StatusChip status={s.status} /><Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>{s.description}</Typography></Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button size="small" component={RouterLink} to={`/seller/shops/${s._id}`}>Edit</Button>
                  <Button size="small" component={RouterLink} to={`/shops/${s._id}`}>View storefront</Button>
                  {s.status !== 'inactive' && <Button size="small" color="error" onClick={() => setDel(s)}>Deactivate</Button>}
                  {s.status === 'inactive' && <Button size="small" onClick={async () => { if (await run(() => sellerApi.updateShop(s._id, { status: 'active' }), 'Shop reactivated')) state.reload(); }}>Reactivate</Button>}
                </Stack>
              </CardContent></Card>
            ))}
          </Box>
        )}
      </AsyncView>
      <ConfirmDialog open={Boolean(del)} title="Deactivate shop?" message={`“${del?.name}” and its products will be hidden from buyers. You can reactivate it later.`} destructive confirmLabel="Deactivate" busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => sellerApi.deleteShop(del._id), 'Shop deactivated'))) { setDel(null); state.reload(); } }} />
    </>
  );
}

type ShopForm = { name: string; description?: string; email?: string; phone?: string; address?: string };
export function SellerShopFormPage() {
  const { id } = useParams();
  const editing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [logo, setLogo] = useState<ImageRef[]>([]);
  const [banner, setBanner] = useState<ImageRef[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShopForm>({ resolver: zodResolver(shopSchema) });
  const shop = useAsync(() => (editing ? sellerApi.shop(id!) : Promise.resolve(null)), [id]);
  useEffect(() => {
    const s = shop.data;
    if (s) { reset({ name: s.name, description: s.description, email: s.contact?.email, phone: s.contact?.phone, address: s.contact?.address }); setLogo(s.logo ? [s.logo] : []); setBanner(s.banner ? [s.banner] : []); setStatus(s.status === 'inactive' ? 'inactive' : 'active'); }
  }, [shop.data, reset]);
  const submit = handleSubmit(async (v) => {
    const body = { name: v.name, description: v.description, logo: logo[0], banner: banner[0], contact: { email: v.email || undefined, phone: v.phone || undefined, address: v.address || undefined } };
    const r = await run(() => (editing ? sellerApi.updateShop(id!, { ...body, status }) : sellerApi.createShop(body)), editing ? 'Shop updated' : 'Shop created');
    if (r) navigate('/seller/shops');
  });
  return (
    <>
      <PageHeader title={editing ? 'Edit shop' : 'Create shop'} />
      <AsyncView state={shop}>
        {() => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 640 }}>
            <Stack spacing={2}>
              <FormText label="Shop name" fieldError={errors.name} {...register('name')} />
              <FormText label="Description" multiline minRows={3} fieldError={errors.description} {...register('description')} />
              <ImageUploader label="Shop logo" value={logo} onChange={setLogo} />
              <ImageUploader label="Shop banner" value={banner} onChange={setBanner} />
              <FormText label="Contact email" fieldError={errors.email} {...register('email')} />
              <FormText label="Contact phone" fieldError={errors.phone} {...register('phone')} />
              <FormText label="Contact address" fieldError={errors.address} {...register('address')} />
              {editing && <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>}
              <Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={busy}>{editing ? 'Save changes' : 'Create shop'}</Button><Button component={RouterLink} to="/seller/shops">Cancel</Button></Stack>
            </Stack>
          </Box>
        )}
      </AsyncView>
    </>
  );
}

// ---------- Orders ----------
export function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const state = useAsync(() => sellerApi.orders({ page, limit: 10, status: status || undefined }), [page, status]);
  return (
    <>
      <PageHeader title="Orders" subtitle="Only orders containing your products are shown." actions={
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>{['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>} />
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No orders" /> : (
          <>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Order</TableCell><TableCell>Date</TableCell><TableCell>Buyer</TableCell><TableCell>Items</TableCell><TableCell>Status</TableCell><TableCell align="right">Subtotal</TableCell></TableRow></TableHead>
              <TableBody>{r.data.map((o) => (
                <TableRow key={o._id} hover data-testid="seller-order-row"><TableCell><Link component={RouterLink} to={`/seller/orders/${o._id}`}>{o.orderNumber}</Link></TableCell><TableCell>{formatDateTime(o.createdAt)}</TableCell><TableCell>{typeof o.buyer === 'object' ? o.buyer.name : ''}</TableCell><TableCell>{o.items.length}</TableCell><TableCell><StatusChip status={o.fulfillmentStatus} /></TableCell><TableCell align="right">{formatCurrency(o.subtotal)}</TableCell></TableRow>
              ))}</TableBody></Table></Paper>
            <Pager pagination={r.pagination} onChange={setPage} />
          </>
        )}
      </AsyncView>
    </>
  );
}

function TrackingDialog({ order, open, markShipped, onClose, onDone }: { order: SellerOrder; open: boolean; markShipped: boolean; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const { register, handleSubmit, formState: { errors } } = useForm<{ carrier: string; trackingNumber: string; trackingUrl?: string }>({
    resolver: zodResolver(trackingSchema), values: { carrier: order.trackingInformation?.carrier ?? '', trackingNumber: order.trackingInformation?.trackingNumber ?? '', trackingUrl: order.trackingInformation?.trackingUrl ?? '' },
  });
  const submit = handleSubmit(async (v) => {
    const body = { ...v, trackingUrl: v.trackingUrl || undefined };
    const r = await run(() => (markShipped ? sellerApi.updateOrderStatus(order._id, { status: 'shipped', ...body }) : sellerApi.updateTracking(order._id, body)), markShipped ? 'Order marked as shipped' : 'Tracking updated');
    if (r) { onDone(); onClose(); }
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="trk-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="trk-title">{markShipped ? 'Mark as shipped' : 'Update tracking'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <FormText label="Carrier" fieldError={errors.carrier} {...register('carrier')} />
          <FormText label="Tracking number" fieldError={errors.trackingNumber} {...register('trackingNumber')} />
          <FormText label="Tracking URL (optional)" fieldError={errors.trackingUrl} {...register('trackingUrl')} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{markShipped ? 'Ship order' : 'Save tracking'}</Button></DialogActions>
      </form>
    </Dialog>
  );
}

export function SellerOrderDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => sellerApi.order(id), [id]);
  const { run, busy } = useAction();
  const [dlg, setDlg] = useState<'ship' | 'track' | null>(null);
  const [cancel, setCancel] = useState(false);
  const labels: Record<string, string> = { processing: 'Accept & start processing', shipped: 'Mark as shipped', delivered: 'Mark as delivered', cancelled: 'Cancel items' };
  return (
    <AsyncView state={state}>
      {(o) => (
        <>
          <PageHeader title={`Order ${o.orderNumber}`} subtitle={`Part of ${o.parentOrderNumber} · ${formatDateTime(o.createdAt)}`} actions={<StatusChip status={o.fulfillmentStatus} size="medium" />} />
          {o.cancellationRequested && <Alert severity="warning" sx={{ mb: 2 }}>The buyer has requested cancellation.</Alert>}
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Shop</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Unit price</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
              <TableBody>{o.items.map((i) => <TableRow key={i._id}><TableCell>{i.name}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{i.sku}</Typography></TableCell><TableCell>{i.shopName}</TableCell><TableCell align="right">{i.quantity}</TableCell><TableCell align="right">{formatCurrency(i.unitPrice)}</TableCell><TableCell align="right">{formatCurrency(i.lineTotal)}</TableCell></TableRow>)}</TableBody></Table></Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Paper variant="outlined" sx={{ p: 2 }}><Typography gutterBottom sx={{ fontWeight: 700 }}>Ship to</Typography>{o.shippingAddress && <AddressBlock a={o.shippingAddress} />}<Typography variant="body2" sx={{ mt: 1 }}>Buyer: {typeof o.buyer === 'object' ? `${o.buyer.name}${o.buyer.email ? ` (${o.buyer.email})` : ''}` : ''}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 700 }}>Financials <Chip size="small" label="simulated" /></Typography>
                {([['Subtotal', o.subtotal], ['Shipping', o.shippingFee], ['Tax', o.tax], [`Commission (${o.commissionRate}%)`, -o.commission], ['Your earnings', o.sellerEarnings]] as const).map(([l, v]) => <Stack key={l} direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2">{l}</Typography><Typography variant="body2">{formatCurrency(v)}</Typography></Stack>)}
              </Paper>
            </Box>
            {o.trackingInformation?.trackingNumber && <Alert severity="info">{o.trackingInformation.carrier} · #{o.trackingInformation.trackingNumber}</Alert>}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {o.allowedTransitions?.filter((s) => s !== 'cancelled').map((s) => (
                <Button key={s} variant="contained" disabled={busy} onClick={() => (s === 'shipped' ? setDlg('ship') : run(() => sellerApi.updateOrderStatus(o._id, { status: s }), 'Order updated').then((r) => r && state.reload()))}>{labels[s] ?? s}</Button>
              ))}
              {['shipped'].includes(o.fulfillmentStatus) && <Button variant="outlined" onClick={() => setDlg('track')}>Update tracking</Button>}
              {o.allowedTransitions?.includes('cancelled') && <Button color="error" variant="outlined" onClick={() => setCancel(true)}>Cancel items</Button>}
            </Stack>
          </Stack>
          <TrackingDialog order={o} open={dlg !== null} markShipped={dlg === 'ship'} onClose={() => setDlg(null)} onDone={state.reload} />
          <ConfirmDialog open={cancel} title="Cancel this order?" message="Stock is restored and the buyer is refunded (simulated)." destructive confirmLabel="Cancel items" busy={busy} onClose={() => setCancel(false)}
            onConfirm={async () => { if (await run(() => sellerApi.updateOrderStatus(o._id, { status: 'cancelled' }), 'Order cancelled')) { setCancel(false); state.reload(); } }} />
        </>
      )}
    </AsyncView>
  );
}

// ---------- Earnings & payouts ----------
export function SellerEarningsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => sellerApi.earnings(page), [page]);
  const { run, busy } = useAction();
  return (
    <>
      <PageHeader title="Earnings" subtitle="All financial figures are simulated — no real money moves." actions={
        <Button variant="contained" disabled={busy || !state.data || state.data.availableForPayout <= 0} onClick={async () => { if (await run(() => sellerApi.requestPayout(), 'Simulated payout created')) state.reload(); }}>Request simulated payout</Button>} />
      <AsyncView state={state}>
        {(e) => (
          <Stack spacing={3}>
            <Alert severity="info">Simulated data: commission is deducted per order using the marketplace commission rate in effect at purchase time.</Alert>
            <Box sx={statGrid}>
              <StatCard label="Gross sales" value={formatCurrency(e.grossSales)} /><StatCard label="Marketplace commission" value={formatCurrency(e.marketplaceCommission)} />
              <StatCard label="Net earnings" value={formatCurrency(e.netEarnings)} /><StatCard label="Pending earnings" value={formatCurrency(e.pendingEarnings)} hint="Until delivered" />
              <StatCard label="Completed earnings" value={formatCurrency(e.completedEarnings)} /><StatCard label="Available for payout" value={formatCurrency(e.availableForPayout)} />
            </Box>
            <Typography variant="h6">Commission history</Typography>
            {e.commissionHistory.length === 0 ? <EmptyState title="No commission records yet" /> : (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Order</TableCell><TableCell align="right">Gross</TableCell><TableCell align="right">Rate</TableCell><TableCell align="right">Commission</TableCell><TableCell align="right">Net</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>{e.commissionHistory.map((c) => <TableRow key={c._id}><TableCell>{formatDateTime(c.createdAt)}</TableCell><TableCell>{typeof c.sellerOrder === 'object' ? c.sellerOrder.orderNumber : ''}</TableCell><TableCell align="right">{formatCurrency(c.grossAmount)}</TableCell><TableCell align="right">{c.commissionRate}%</TableCell><TableCell align="right">{formatCurrency(c.commissionAmount)}</TableCell><TableCell align="right">{formatCurrency(c.netAmount)}</TableCell><TableCell><StatusChip status={c.status} /></TableCell></TableRow>)}</TableBody></Table></Paper>
            )}
            <Pager pagination={e.pagination} onChange={setPage} />
          </Stack>
        )}
      </AsyncView>
    </>
  );
}

export function SellerPayoutsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => sellerApi.payouts(page), [page]);
  return (
    <>
      <PageHeader title="Payout history" subtitle="Simulated payouts only." />
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No payouts yet" description="Request a simulated payout from the Earnings page once orders are delivered." /> : (
          <><Paper variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Reference</TableCell><TableCell>Status</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((p) => <TableRow key={p._id}><TableCell>{formatDateTime(p.createdAt)}</TableCell><TableCell>{p.reference}</TableCell><TableCell><StatusChip status={p.status} /></TableCell><TableCell align="right">{formatCurrency(p.amount)}</TableCell></TableRow>)}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
    </>
  );
}
