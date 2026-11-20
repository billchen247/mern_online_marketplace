import { zodResolver } from '@hookform/resolvers/zod';
import Add from '@mui/icons-material/Add';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { adminApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormText } from '../../components/FormFields';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatCard, StatusChip, TrendChart, statGrid } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Category, Order, Product, ReturnRequest, Shop } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { categoryFormSchema, settingsFormSchema } from '../../validation/schemas';

const name = (x: unknown) => (x && typeof x === 'object' && 'name' in x ? String((x as { name: string }).name) : '');
const tableSx = { overflowX: 'auto' } as const;

function Filters({ children }: { children: ReactNode }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>{children}</Stack>;
}
function StatusFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <TextField select size="small" label="Status" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 160 }}>
      <MenuItem value="">All</MenuItem>{options.map((o) => <MenuItem key={o} value={o}>{o.replace(/_/g, ' ')}</MenuItem>)}
    </TextField>
  );
}

export function AdminDashboardPage() {
  const state = useAsync(() => adminApi.dashboard(), []);
  return (
    <>
      <PageHeader title="Admin dashboard" />
      <AsyncView state={state}>
        {(d) => (
          <Stack spacing={3}>
            <Box sx={statGrid}>
              <StatCard label="Users" value={d.totalUsers} /><StatCard label="Sellers" value={d.totalSellers} /><StatCard label="Shops" value={d.totalShops} />
              <StatCard label="Products" value={d.totalProducts} /><StatCard label="Orders" value={d.totalOrders} /><StatCard label="Gross sales" value={formatCurrency(d.grossSales)} />
              <StatCard label="Commission earned" value={formatCurrency(d.commissions)} /><StatCard label="Pending applications" value={d.pendingSellerApplications} /><StatCard label="Pending returns" value={d.pendingReturns} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Sales — last 14 days</Typography><TrendChart data={d.salesTrend} /></Paper>
            <Paper variant="outlined" sx={{ p: 2 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Recent orders</Typography>
              {d.recentOrders.map((o) => <Stack key={o._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}><Link component={RouterLink} to={`/admin/orders/${o._id}`}>{o.orderNumber}</Link><StatusChip status={o.orderStatus} /><Typography variant="body2">{formatCurrency(o.total)}</Typography></Stack>)}
            </Paper>
          </Stack>
        )}
      </AsyncView>
    </>
  );
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.users({ page, search: dq || undefined, role: role || undefined }), [page, dq, role]);
  const { run, busy } = useAction();
  const [confirm, setConfirm] = useState<{ id: string; label: string; body: Parameters<typeof adminApi.updateUser>[1] } | null>(null);
  return (
    <>
      <PageHeader title="Users" subtitle="Roles are additive. Admin and seller access is enforced by the server." />
      <Filters>
        <TextField size="small" label="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <TextField select size="small" label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}><MenuItem value="">All</MenuItem>{['user', 'seller', 'admin'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField>
      </Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No users found" /> : (
          <><Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Roles</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((u) => {
              const uid = u._id ?? u.id;
              return (
                <TableRow key={uid} data-testid="user-row"><TableCell>{u.name}</TableCell><TableCell>{u.email}</TableCell>
                  <TableCell>{u.roles.map((x) => <Chip key={x} size="small" label={x} sx={{ mr: 0.5 }} />)}</TableCell><TableCell><StatusChip status={u.status} /></TableCell>
                  <TableCell align="right">
                    {u.roles.includes('admin')
                      ? <Button size="small" onClick={() => setConfirm({ id: uid, label: `Remove admin role from ${u.name}`, body: { removeRoles: ['admin'] } })}>Remove admin</Button>
                      : <Button size="small" onClick={() => setConfirm({ id: uid, label: `Grant admin role to ${u.name}`, body: { addRoles: ['admin'] } })}>Make admin</Button>}
                    {u.status === 'suspended'
                      ? <Button size="small" onClick={() => setConfirm({ id: uid, label: `Reactivate ${u.name}`, body: { status: 'active' } })}>Reactivate</Button>
                      : <Button size="small" color="error" onClick={() => setConfirm({ id: uid, label: `Suspend ${u.name}`, body: { status: 'suspended' } })}>Suspend</Button>}
                  </TableCell></TableRow>
              );
            })}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
      <ConfirmDialog open={Boolean(confirm)} title="Confirm action" message={confirm?.label ?? ''} busy={busy} onClose={() => setConfirm(null)}
        onConfirm={async () => { if (confirm && (await run(() => adminApi.updateUser(confirm.id, confirm.body), 'User updated'))) { setConfirm(null); state.reload(); } }} />
    </>
  );
}

export function AdminApplicationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const state = useAsync(() => adminApi.applications({ page, status: status || undefined }), [page, status]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ id: string; decision: 'approved' | 'rejected'; business: string } | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <>
      <PageHeader title="Seller applications" />
      <Filters><StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['pending', 'approved', 'rejected']} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No applications" /> : (
          <><Stack spacing={2}>{r.data.map((a) => (
            <Paper key={a._id} variant="outlined" sx={{ p: 2 }} data-testid="application-card">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                <Box><Typography sx={{ fontWeight: 700 }}>{a.businessName}</Typography><Typography variant="body2" color="text.secondary">{name(a.user)}{typeof a.user === 'object' ? ` · ${a.user.email}` : ''} · {formatDateTime(a.createdAt)}</Typography><Typography variant="body2" sx={{ mt: 1 }}>{a.businessDescription}</Typography><Typography variant="caption" color="text.secondary">{a.contactInformation.email} · {a.contactInformation.phone}</Typography></Box>
                <Stack spacing={1} sx={{ alignItems: 'flex-end' }}><StatusChip status={a.applicationStatus} />
                  {a.applicationStatus === 'pending' && <Stack direction="row" spacing={1}><Button size="small" variant="contained" onClick={() => { setNotes(''); setTarget({ id: a._id, decision: 'approved', business: a.businessName }); }}>Approve</Button><Button size="small" color="error" onClick={() => { setNotes(''); setTarget({ id: a._id, decision: 'rejected', business: a.businessName }); }}>Reject</Button></Stack>}
                </Stack>
              </Stack>
              {a.reviewNotes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Notes: {a.reviewNotes}</Typography>}
            </Paper>))}</Stack><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="xs" aria-labelledby="app-title">
        <DialogTitle id="app-title">{target?.decision === 'approved' ? 'Approve' : 'Reject'} “{target?.business}”</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={2} size="small" label="Review notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={busy} onClick={async () => { if (target && (await run(() => adminApi.reviewApplication(target.id, { status: target.decision, reviewNotes: notes || undefined }), `Application ${target.decision}`))) { setTarget(null); state.reload(); } }}>Confirm</Button></DialogActions>
      </Dialog>
    </>
  );
}

export function AdminSellersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.sellers({ page, search: dq || undefined }), [page, dq]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ id: string; action: 'suspend' | 'reactivate'; name: string } | null>(null);
  return (
    <>
      <PageHeader title="Sellers" subtitle="Suspending a seller hides their shops and products from buyers." />
      <Filters><TextField size="small" label="Search sellers" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No sellers" /> : (
          <><Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell align="right">Shops</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.email}</TableCell><TableCell align="right">{s.shops}</TableCell><TableCell><StatusChip status={s.status} /></TableCell>
              <TableCell align="right">{s.status === 'suspended' ? <Button size="small" onClick={() => setTarget({ id: s.id, action: 'reactivate', name: s.name })}>Reactivate</Button> : <Button size="small" color="error" onClick={() => setTarget({ id: s.id, action: 'suspend', name: s.name })}>Suspend</Button>}</TableCell></TableRow>)}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
      <ConfirmDialog open={Boolean(target)} title={`${target?.action === 'suspend' ? 'Suspend' : 'Reactivate'} seller?`} message={target?.name ?? ''} destructive={target?.action === 'suspend'} busy={busy} onClose={() => setTarget(null)}
        onConfirm={async () => { if (target && (await run(() => adminApi.updateSeller(target.id, { action: target.action }), 'Seller updated'))) { setTarget(null); state.reload(); } }} />
    </>
  );
}

export function AdminShopsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.shops({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  const { run } = useAction();
  const set = async (s: Shop, st: string) => { if (await run(() => adminApi.updateShop(s._id, st), 'Shop updated')) state.reload(); };
  return (
    <>
      <PageHeader title="Shops" />
      <Filters><TextField size="small" label="Search shops" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /><StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['pending', 'active', 'inactive', 'suspended']} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No shops" /> : (
          <><Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Shop</TableCell><TableCell>Seller</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((s) => <TableRow key={s._id}><TableCell>{s.name}</TableCell><TableCell>{name(s.seller)}</TableCell><TableCell><StatusChip status={s.status} /></TableCell>
              <TableCell align="right">{s.status !== 'active' && <Button size="small" onClick={() => set(s, 'active')}>Approve / activate</Button>}{s.status !== 'suspended' && <Button size="small" color="error" onClick={() => set(s, 'suspended')}>Suspend</Button>}</TableCell></TableRow>)}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
    </>
  );
}

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.products({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  const { run } = useAction();
  const upd = async (p: Product, b: { status?: string; featured?: boolean }) => { if (await run(() => adminApi.updateProduct(p._id, b), 'Product updated')) state.reload(); };
  return (
    <>
      <PageHeader title="Products" subtitle="Block policy-violating products or feature them on the home page." />
      <Filters><TextField size="small" label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /><StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['active', 'draft', 'inactive', 'blocked']} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No products" /> : (
          <><Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>Shop</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Stock</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((p) => <TableRow key={p._id}><TableCell>{p.name}</TableCell><TableCell>{name(p.shop)}</TableCell><TableCell align="right">{formatCurrency(p.finalPrice)}</TableCell><TableCell align="right">{p.stock}</TableCell><TableCell><StatusChip status={p.status} />{p.featured && <Chip size="small" label="featured" sx={{ ml: 0.5 }} />}</TableCell>
              <TableCell align="right">{p.status === 'blocked' ? <Button size="small" onClick={() => upd(p, { status: 'active' })}>Unblock</Button> : <Button size="small" color="error" onClick={() => upd(p, { status: 'blocked' })}>Block</Button>}<Button size="small" onClick={() => upd(p, { featured: !p.featured })}>{p.featured ? 'Unfeature' : 'Feature'}</Button></TableCell></TableRow>)}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
    </>
  );
}

export function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => adminApi.reviews({ page }), [page]);
  const { run } = useAction();
  return (
    <>
      <PageHeader title="Review moderation" />
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No reviews" /> : (
          <><Stack spacing={1.5}>{r.data.map((rv) => (
            <Paper key={rv._id} variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Box><Typography sx={{ fontWeight: 600 }}>{'★'.repeat(rv.rating)} {rv.title}</Typography><Typography variant="body2">{rv.comment}</Typography><Typography variant="caption" color="text.secondary">{name(rv.buyer)} on {name(rv.product)} · {formatDateTime(rv.createdAt)}</Typography></Box>
              <Stack spacing={1} sx={{ alignItems: 'flex-end' }}><StatusChip status={rv.status} /><Button size="small" onClick={async () => { if (await run(() => adminApi.moderateReview(rv._id, rv.status === 'hidden' ? 'published' : 'hidden'), 'Review updated')) state.reload(); }}>{rv.status === 'hidden' ? 'Restore' : 'Hide'}</Button></Stack>
            </Stack></Paper>))}</Stack><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
    </>
  );
}

type CatForm = { name: string; description?: string; parentCategory?: string; status: 'active' | 'inactive' };
export function AdminCategoriesPage() {
  const state = useAsync(() => adminApi.categories(), []);
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<Category | 'new' | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CatForm>({ resolver: zodResolver(categoryFormSchema), defaultValues: { name: '', description: '', parentCategory: '', status: 'active' } });
  useEffect(() => {
    if (edit && edit !== 'new') reset({ name: edit.name, description: edit.description ?? '', parentCategory: edit.parentCategory ?? '', status: edit.status ?? 'active' });
    else reset({ name: '', description: '', parentCategory: '', status: 'active' });
  }, [edit, reset]);
  const submit = handleSubmit(async (v) => {
    const body = { ...v, parentCategory: v.parentCategory || null };
    const r = await run(() => (edit === 'new' ? adminApi.createCategory(body) : adminApi.updateCategory((edit as Category)._id, body)), edit === 'new' ? 'Category created' : 'Category updated');
    if (r) { setEdit(null); state.reload(); }
  });
  return (
    <>
      <PageHeader title="Categories" actions={<Button variant="contained" startIcon={<Add />} onClick={() => setEdit('new')}>Add category</Button>} />
      <AsyncView state={state}>
        {(cats) => cats.length === 0 ? <EmptyState title="No categories" /> : (
          <Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Slug</TableCell><TableCell>Parent</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{cats.map((c) => <TableRow key={c._id}><TableCell>{c.name}</TableCell><TableCell>{c.slug}</TableCell><TableCell>{cats.find((x) => x._id === c.parentCategory)?.name ?? '—'}</TableCell><TableCell><StatusChip status={c.status ?? 'active'} /></TableCell>
              <TableCell align="right"><Button size="small" onClick={() => setEdit(c)}>Edit</Button><Button size="small" color="error" onClick={() => setDel(c)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></Paper>
        )}
      </AsyncView>
      <Dialog open={edit !== null} onClose={() => setEdit(null)} fullWidth maxWidth="xs" aria-labelledby="cat-title">
        <form onSubmit={submit} noValidate>
          <DialogTitle id="cat-title">{edit === 'new' ? 'Add category' : 'Edit category'}</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
            <FormText label="Name" fieldError={errors.name} {...register('name')} />
            <FormText label="Description" multiline minRows={2} fieldError={errors.description} {...register('description')} />
            <Controller name="parentCategory" control={control} render={({ field }) => <TextField select size="small" label="Parent category" {...field} value={field.value ?? ''}><MenuItem value="">None</MenuItem>{state.data?.filter((c) => edit === 'new' || c._id !== (edit as Category | null)?._id).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}</TextField>} />
            <Controller name="status" control={control} render={({ field }) => <TextField select size="small" label="Status" {...field}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>} />
          </Stack></DialogContent>
          <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>Save</Button></DialogActions>
        </form>
      </Dialog>
      <ConfirmDialog open={Boolean(del)} title="Delete category?" message={`“${del?.name}” will be deleted. Categories that still contain products cannot be deleted.`} destructive confirmLabel="Delete" busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => adminApi.deleteCategory(del._id), 'Category deleted')) !== undefined) { setDel(null); state.reload(); } }} />
    </>
  );
}

export function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.orders({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  return (
    <>
      <PageHeader title="Orders" />
      <Filters><TextField size="small" label="Search order number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['pending', 'paid', 'processing', 'partially_fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded']} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No orders" /> : (
          <><Paper variant="outlined" sx={tableSx}><Table size="small"><TableHead><TableRow><TableCell>Order</TableCell><TableCell>Date</TableCell><TableCell>Buyer</TableCell><TableCell>Status</TableCell><TableCell>Payment</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((o: Order) => <TableRow key={o._id} hover data-testid="admin-order-row"><TableCell><Link component={RouterLink} to={`/admin/orders/${o._id}`}>{o.orderNumber}</Link></TableCell><TableCell>{formatDateTime(o.createdAt)}</TableCell><TableCell>{name(o.buyer)}</TableCell><TableCell><StatusChip status={o.orderStatus} /></TableCell><TableCell><StatusChip status={o.paymentStatus} /></TableCell><TableCell align="right">{formatCurrency(o.total)}</TableCell></TableRow>)}</TableBody></Table></Paper><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
    </>
  );
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => adminApi.order(id), [id]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<string | null>(null);
  return (
    <AsyncView state={state}>
      {(o) => (
        <>
          <PageHeader title={`Order ${o.orderNumber}`} subtitle={`${formatDateTime(o.createdAt)} · ${name(o.buyer)}`} actions={<StatusChip status={o.orderStatus} size="medium" />} />
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {([['Subtotal', o.subtotal], ['Shipping', o.shippingFee], ['Tax', o.tax], ['Discount', -o.discount], ['Total', o.total], ['Refunded', o.refundedAmount]] as const).map(([l, v]) => <Stack key={l} direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2">{l}</Typography><Typography variant="body2">{formatCurrency(v)}</Typography></Stack>)}
              <Typography variant="caption" color="text.secondary">Payment: {o.paymentMethod} · {o.paymentStatus} (simulated)</Typography>
            </Paper>
            {o.sellerOrders.map((so) => (
              <Paper key={so._id} variant="outlined" sx={{ p: 2 }} data-testid="admin-seller-order">
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}><Typography sx={{ fontWeight: 700 }}>{so.orderNumber} · {name(so.seller)}</Typography><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><StatusChip status={so.fulfillmentStatus} />
                  {!['delivered', 'cancelled'].includes(so.fulfillmentStatus) && <Button size="small" color="error" onClick={() => setTarget(so._id)}>Cancel</Button>}</Stack></Stack>
                {so.items.map((i) => <Stack key={i._id} direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2">{i.quantity} × {i.name}</Typography><Typography variant="body2">{formatCurrency(i.lineTotal)}</Typography></Stack>)}
                <Typography variant="caption" color="text.secondary">Commission {formatCurrency(so.commission)} · Seller earnings {formatCurrency(so.sellerEarnings)}</Typography>
              </Paper>))}
          </Stack>
          <ConfirmDialog open={Boolean(target)} title="Cancel seller order?" message="Stock is restored and the amount is refunded (simulated)." destructive confirmLabel="Cancel order" busy={busy} onClose={() => setTarget(null)}
            onConfirm={async () => { if (target && (await run(() => adminApi.cancelSellerOrder(target, 'Cancelled by admin'), 'Seller order cancelled'))) { setTarget(null); state.reload(); } }} />
        </>
      )}
    </AsyncView>
  );
}

export function AdminReturnsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('requested');
  const state = useAsync(() => adminApi.returns({ page, status: status || undefined }), [page, status]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ r: ReturnRequest; decision: 'approved' | 'rejected' | 'refunded' } | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <>
      <PageHeader title="Returns & refunds" subtitle="Refunds are simulated." />
      <Filters><StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['requested', 'approved', 'rejected', 'refunded']} /></Filters>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No return requests" /> : (
          <><Stack spacing={1.5}>{r.data.map((x) => (
            <Paper key={x._id} variant="outlined" sx={{ p: 2 }} data-testid="return-card"><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Box><Typography sx={{ fontWeight: 700 }}>{typeof x.order === 'object' ? x.order.orderNumber : x.order}</Typography><Typography variant="body2">{x.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</Typography><Typography variant="body2" color="text.secondary">Reason: {x.reason}</Typography><Typography variant="caption" color="text.secondary">{name(x.buyer)} · {formatDateTime(x.createdAt)} · Refund {formatCurrency(x.refundAmount)}</Typography></Box>
              <Stack spacing={1} sx={{ alignItems: 'flex-end' }}><StatusChip status={x.status} />
                <Stack direction="row" spacing={1}>
                  {x.status === 'requested' && <><Button size="small" variant="contained" onClick={() => { setNotes(''); setTarget({ r: x, decision: 'approved' }); }}>Approve</Button><Button size="small" color="error" onClick={() => { setNotes(''); setTarget({ r: x, decision: 'rejected' }); }}>Reject</Button></>}
                  {x.status === 'approved' && <Button size="small" variant="contained" onClick={() => { setNotes(''); setTarget({ r: x, decision: 'refunded' }); }}>Issue refund</Button>}
                </Stack></Stack>
            </Stack></Paper>))}</Stack><Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="xs" aria-labelledby="ret-title">
        <DialogTitle id="ret-title" sx={{ textTransform: 'capitalize' }}>{target?.decision === 'refunded' ? 'Issue refund' : `${target?.decision?.replace('ed', '')} return`}</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={2} size="small" label="Admin notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setTarget(null)}>Cancel</Button><Button variant="contained" disabled={busy} onClick={async () => { if (target && (await run(() => adminApi.resolveReturn(target.r._id, { status: target.decision, adminNotes: notes || undefined }), 'Return updated'))) { setTarget(null); state.reload(); } }}>Confirm</Button></DialogActions>
      </Dialog>
    </>
  );
}

type SForm = { marketplaceName: string; tagline: string; primaryColor: string; commissionRate: number; flatRate: number; freeShippingThreshold: number; taxRate: number; requireProductApproval: boolean; requireShopApproval: boolean };
export function AdminSettingsPage() {
  const state = useAsync(() => adminApi.settings(), []);
  const { run, busy } = useAction();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<SForm>({ resolver: zodResolver(settingsFormSchema) as never });
  useEffect(() => {
    const s = state.data;
    if (s) reset({ marketplaceName: s.marketplaceName, tagline: s.tagline, primaryColor: s.primaryColor, commissionRate: s.commissionRate, flatRate: s.shipping.flatRate, freeShippingThreshold: s.shipping.freeShippingThreshold, taxRate: s.tax.rate, requireProductApproval: s.moderation.requireProductApproval, requireShopApproval: s.moderation.requireShopApproval });
  }, [state.data, reset]);
  const submit = handleSubmit(async (v) => {
    await run(() => adminApi.updateSettings({ marketplaceName: v.marketplaceName, tagline: v.tagline, primaryColor: v.primaryColor, commissionRate: v.commissionRate, shipping: { flatRate: v.flatRate, freeShippingThreshold: v.freeShippingThreshold }, tax: { rate: v.taxRate }, moderation: { requireProductApproval: v.requireProductApproval, requireShopApproval: v.requireShopApproval } }), 'Settings saved');
  });
  return (
    <>
      <PageHeader title="Marketplace settings" subtitle="Commission changes apply to future orders only." />
      <AsyncView state={state}>
        {() => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 640 }}><Stack spacing={2}>
            <FormText label="Marketplace name" fieldError={errors.marketplaceName} {...register('marketplaceName')} />
            <FormText label="Tagline" fieldError={errors.tagline} {...register('tagline')} />
            <FormText label="Primary color (hex)" fieldError={errors.primaryColor} {...register('primaryColor')} />
            <FormText label="Commission rate (%)" type="number" slotProps={{ htmlInput: { step: '0.1' } }} fieldError={errors.commissionRate} {...register('commissionRate', { valueAsNumber: true })} />
            <FormText label="Flat shipping rate" type="number" slotProps={{ htmlInput: { step: '0.01' } }} fieldError={errors.flatRate} {...register('flatRate', { valueAsNumber: true })} />
            <FormText label="Free shipping threshold" type="number" slotProps={{ htmlInput: { step: '0.01' } }} fieldError={errors.freeShippingThreshold} {...register('freeShippingThreshold', { valueAsNumber: true })} />
            <FormText label="Tax rate (%)" type="number" slotProps={{ htmlInput: { step: '0.1' } }} fieldError={errors.taxRate} {...register('taxRate', { valueAsNumber: true })} />
            <Controller name="requireProductApproval" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(_, c) => field.onChange(c)} />} label="Require approval for new products" />} />
            <Controller name="requireShopApproval" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(_, c) => field.onChange(c)} />} label="Require approval for new shops" />} />
            <Box><Button type="submit" variant="contained" disabled={busy}>Save settings</Button></Box>
          </Stack></Box>
        )}
      </AsyncView>
    </>
  );
}
