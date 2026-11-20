import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { userApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormText } from '../../components/FormFields';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Address } from '../../types';
import { formatDateTime } from '../../utils/format';
import { profileSchema, sellerApplicationSchema } from '../../validation/schemas';
import { AddressBlock, AddressDialog } from './CheckoutPage';

export function AccountHome() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0]}`} subtitle="Manage your orders, addresses and account settings." />
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>{user?.roles.map((r) => <Chip key={r} label={r} color={r === 'user' ? 'default' : 'primary'} />)}</Stack>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        {[['Orders', 'Track and manage your purchases', '/account/orders'], ['Addresses', 'Edit your shipping addresses', '/account/addresses'], ['Wishlist', 'Products you saved for later', '/wishlist'],
          ...(user?.roles.includes('seller') ? [['Seller portal', 'Manage your shops and orders', '/seller']] : [['Become a seller', 'Apply to sell on the marketplace', '/account/become-seller']])].map(([t, d, to]) => (
          <Card key={to} variant="outlined"><CardContent><Typography variant="h6">{t}</Typography><Typography color="text.secondary" sx={{ mb: 1 }}>{d}</Typography><Button component={RouterLink} to={to}>Open</Button></CardContent></Card>
        ))}
      </Box>
    </>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { run, busy } = useAction();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; phone?: string }>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name, phone: user?.phone ?? '' } });
  const pw = useForm<{ currentPassword: string; newPassword: string }>();
  useEffect(() => reset({ name: user?.name, phone: user?.phone ?? '' }), [user, reset]);
  return (
    <>
      <PageHeader title="Profile" subtitle={user?.email} />
      <Stack spacing={4} sx={{ maxWidth: 480 }}>
        <Box component="form" noValidate onSubmit={handleSubmit(async (v) => { if (await run(() => userApi.update(v), 'Profile updated')) await refreshUser(); })}>
          <Stack spacing={2}>
            <FormText label="Name" fieldError={errors.name} {...register('name')} />
            <FormText label="Phone" fieldError={errors.phone} {...register('phone')} />
            <Button type="submit" variant="contained" disabled={busy}>Save profile</Button>
          </Stack>
        </Box>
        <Box component="form" onSubmit={pw.handleSubmit(async (v) => { if (await run(() => userApi.update(v), 'Password changed')) pw.reset(); })}>
          <Stack spacing={2}>
            <Typography variant="h6">Change password</Typography>
            <TextField size="small" type="password" label="Current password" autoComplete="current-password" {...pw.register('currentPassword', { required: true })} />
            <TextField size="small" type="password" label="New password" autoComplete="new-password" helperText="8+ characters with a letter and a number" {...pw.register('newPassword', { required: true, minLength: 8 })} />
            <Button type="submit" variant="outlined" disabled={busy}>Change password</Button>
          </Stack>
        </Box>
      </Stack>
    </>
  );
}

export function AddressesPage() {
  const state = useAsync(() => userApi.addresses(), []);
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Address | null>(null);
  return (
    <>
      <PageHeader title="Addresses" actions={<Button variant="contained" onClick={() => { setEdit(null); setOpen(true); }}>Add address</Button>} />
      <AsyncView state={state}>
        {(rows) => rows.length === 0 ? <EmptyState title="No saved addresses" description="Add an address to speed up checkout." /> : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {rows.map((a) => (
              <Card key={a._id} variant="outlined" data-testid="address-card"><CardContent>
                {a.isDefault && <Chip size="small" color="primary" label="Default" sx={{ mb: 1 }} />}
                <AddressBlock a={a} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => { setEdit(a); setOpen(true); }}>Edit</Button>
                  {!a.isDefault && <Button size="small" onClick={async () => { if (await run(() => userApi.updateAddress(a._id, { isDefault: true }), 'Default address updated')) state.reload(); }}>Make default</Button>}
                  <Button size="small" color="error" onClick={() => setDel(a)}>Delete</Button>
                </Stack>
              </CardContent></Card>
            ))}
          </Box>
        )}
      </AsyncView>
      <AddressDialog open={open} initial={edit} onClose={() => setOpen(false)} onSaved={state.reload} />
      <ConfirmDialog open={Boolean(del)} title="Delete address?" message="This address will be removed. Past orders keep their own copy." destructive confirmLabel="Delete" busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => userApi.deleteAddress(del._id), 'Address deleted')) !== undefined) { setDel(null); state.reload(); } }} />
    </>
  );
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => userApi.notifications(page), [page]);
  const { run } = useAction();
  return (
    <>
      <PageHeader title="Notifications" actions={<Button onClick={async () => { if (await run(() => userApi.readAllNotifications(), 'All marked as read')) state.reload(); }}>Mark all as read</Button>} />
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="You're all caught up" /> : (
          <Stack spacing={1}>
            {r.data.map((n) => (
              <Card key={n._id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: n.read ? 'divider' : 'primary.main' }}><CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography sx={{ fontWeight: n.read ? 400 : 700 }}>{n.title}</Typography><Typography variant="caption" color="text.secondary">{formatDateTime(n.createdAt)}</Typography></Stack>
                <Typography variant="body2">{n.message}</Typography>
                <Stack direction="row" spacing={1}>
                  {n.link && <Button size="small" component={RouterLink} to={n.link}>View</Button>}
                  {!n.read && <Button size="small" onClick={async () => { if (await run(() => userApi.readNotification(n._id))) state.reload(); }}>Mark read</Button>}
                </Stack>
              </CardContent></Card>
            ))}
            <Pager pagination={r.pagination} onChange={setPage} />
          </Stack>
        )}
      </AsyncView>
    </>
  );
}

export function BecomeSellerPage() {
  const { user, refreshUser } = useAuth();
  const app = useAsync(() => userApi.myApplication(), []);
  const { run, busy } = useAction();
  const { register, handleSubmit, formState: { errors } } = useForm<{ businessName: string; businessDescription: string; email: string; phone: string; address?: string }>({ resolver: zodResolver(sellerApplicationSchema), defaultValues: { email: user?.email } });
  const isSeller = user?.roles.includes('seller');
  const a = app.data;
  return (
    <>
      <PageHeader title="Become a seller" subtitle="Apply to open shops and sell on the marketplace. An administrator reviews every application." />
      <AsyncView state={app} allowNull>
        {() => (
          <Stack spacing={3} sx={{ maxWidth: 560 }}>
            {a && (
              <Alert severity={a.applicationStatus === 'approved' ? 'success' : a.applicationStatus === 'rejected' ? 'error' : 'info'} data-testid="application-status">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><span>Your application for <b>{a.businessName}</b> is</span><StatusChip status={a.applicationStatus} /></Stack>
                {a.reviewNotes && <Typography variant="body2">Reviewer notes: {a.reviewNotes}</Typography>}
              </Alert>
            )}
            {isSeller && <Button component={RouterLink} to="/seller" variant="contained">Go to seller portal</Button>}
            {!isSeller && a?.applicationStatus === 'approved' && <Button onClick={() => refreshUser()}>Refresh my roles</Button>}
            {!isSeller && (!a || a.applicationStatus === 'rejected') && (
              <Box component="form" noValidate onSubmit={handleSubmit(async (v) => {
                if (await run(() => userApi.applyToSell({ businessName: v.businessName, businessDescription: v.businessDescription, contactInformation: { email: v.email, phone: v.phone, address: v.address || undefined } }), 'Application submitted')) app.reload();
              })}>
                <Stack spacing={2}>
                  <FormText label="Business name" fieldError={errors.businessName} {...register('businessName')} />
                  <FormText label="Business description" multiline minRows={3} fieldError={errors.businessDescription} {...register('businessDescription')} />
                  <FormText label="Contact email" fieldError={errors.email} {...register('email')} />
                  <FormText label="Contact phone" fieldError={errors.phone} {...register('phone')} />
                  <FormText label="Business address (optional)" fieldError={errors.address} {...register('address')} />
                  <Button type="submit" variant="contained" disabled={busy}>Submit application</Button>
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </AsyncView>
    </>
  );
}
