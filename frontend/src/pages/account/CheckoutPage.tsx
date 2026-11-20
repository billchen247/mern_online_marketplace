import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Stack, Typography, Checkbox } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { orderApi, userApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { EmptyState, ErrorState, Loading } from '../../components/StateViews';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Address } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import { formatCurrency } from '../../utils/format';
import { addressSchema } from '../../validation/schemas';
import { SummaryRows } from './CartCheckout';

type AddressForm = Omit<Address, '_id'>;

export function AddressDialog({ open, initial, onClose, onSaved }: { open: boolean; initial?: Address | null; onClose: () => void; onSaved: () => void }) {
  const { run, busy } = useAction();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'US', isDefault: false },
  });
  useEffect(() => {
    if (open) reset(initial ? { ...initial } : { recipientName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US', isDefault: false });
  }, [open, initial, reset]);
  const save = handleSubmit(async (v) => {
    const r = await run(() => (initial ? userApi.updateAddress(initial._id, v) : userApi.addAddress(v)), initial ? 'Address updated' : 'Address added');
    if (r) { onSaved(); onClose(); }
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="addr-title">
      <form onSubmit={save} noValidate>
        <DialogTitle id="addr-title">{initial ? 'Edit address' : 'Add address'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormText label="Recipient name" fieldError={errors.recipientName} {...register('recipientName')} />
            <FormText label="Phone" fieldError={errors.phone} {...register('phone')} />
            <FormText label="Address line 1" fieldError={errors.addressLine1} {...register('addressLine1')} />
            <FormText label="Address line 2 (optional)" fieldError={errors.addressLine2} {...register('addressLine2')} />
            <Stack direction="row" spacing={2}>
              <FormText label="City" fieldError={errors.city} {...register('city')} />
              <FormText label="State" fieldError={errors.state} {...register('state')} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormText label="Postal code" fieldError={errors.postalCode} {...register('postalCode')} />
              <FormText label="Country" fieldError={errors.country} {...register('country')} />
            </Stack>
            <FormControlLabel control={<Checkbox {...register('isDefault')} defaultChecked={Boolean(initial?.isDefault)} />} label="Set as default address" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>Save address</Button></DialogActions>
      </form>
    </Dialog>
  );
}

export function AddressBlock({ a }: { a: Omit<Address, '_id'> }) {
  return (
    <Typography variant="body2" component="address" sx={{ fontStyle: 'normal' }}>
      <b>{a.recipientName}</b> · {a.phone}<br />{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}<br />{a.city}, {a.state} {a.postalCode}, {a.country}
    </Typography>
  );
}

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const coupon = (location.state as { coupon?: string } | null)?.coupon;
  const addresses = useAsync(() => userApi.addresses(), []);
  const [addressId, setAddressId] = useState<string>('');
  const [method, setMethod] = useState<'card' | 'paypal' | 'cod'>('card');
  const [dialog, setDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  // One idempotency key per checkout attempt: double-clicks / retries can never create two orders.
  const key = useRef(crypto.randomUUID());

  useEffect(() => { void refresh(coupon); }, [refresh, coupon]);
  useEffect(() => {
    if (addresses.data && !addressId) setAddressId((addresses.data.find((a) => a.isDefault) ?? addresses.data[0])?._id ?? '');
  }, [addresses.data, addressId]);

  if (!cart) return <Loading />;
  if (cart.items.length === 0) return <Container sx={{ py: 4 }}><EmptyState title="Your cart is empty" action={<Button component={RouterLink} to="/products" variant="contained">Shop now</Button>} /></Container>;

  const place = async () => {
    setPlacing(true);
    setError(null);
    try {
      const order = await orderApi.checkout({ addressId, paymentMethod: method, couponCode: coupon, paymentToken: method === 'card' ? 'tok_simulated_success' : undefined }, key.current);
      await refresh();
      navigate(`/account/orders/${order._id}`, { replace: true, state: { placed: true } });
    } catch (e) {
      setError(getErrorMessage(e));
      key.current = crypto.randomUUID(); // a genuinely failed attempt may be retried with a fresh key
      void refresh(coupon);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>Checkout</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={3}>
          <Card variant="outlined"><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6">1. Shipping address</Typography><Button onClick={() => setDialog(true)}>Add new address</Button></Stack>
            {addresses.error ? <ErrorState message={addresses.error} onRetry={addresses.reload} /> : addresses.data?.length === 0 ? <Alert severity="info">Add a shipping address to continue.</Alert> : (
              <RadioGroup value={addressId} onChange={(e) => setAddressId(e.target.value)} aria-label="Shipping address">
                {addresses.data?.map((a) => <FormControlLabel key={a._id} value={a._id} control={<Radio />} sx={{ alignItems: 'flex-start', my: 0.5 }} label={<AddressBlock a={a} />} />)}
              </RadioGroup>
            )}
          </CardContent></Card>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6">2. Payment method</Typography>
            <Alert severity="info" sx={{ my: 1 }}>Payments are <b>simulated</b> in this demo. No real charge is made.</Alert>
            <RadioGroup value={method} onChange={(e) => setMethod(e.target.value as typeof method)} aria-label="Payment method">
              <FormControlLabel value="card" control={<Radio />} label="Credit / debit card (simulated)" />
              <FormControlLabel value="paypal" control={<Radio />} label="PayPal (simulated)" />
              <FormControlLabel value="cod" control={<Radio />} label="Cash on delivery" />
            </RadioGroup>
          </CardContent></Card>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6" gutterBottom>3. Review items</Typography>
            {cart.items.map((i) => <Stack key={i.id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}><Typography variant="body2">{i.quantity} × {i.product?.name} <Typography component="span" variant="caption" color="text.secondary">({i.product?.shop.name})</Typography></Typography><Typography variant="body2">{formatCurrency((i.product?.finalPrice ?? 0) * i.quantity)}</Typography></Stack>)}
          </CardContent></Card>
        </Stack>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" gutterBottom>Order summary</Typography>
          <SummaryRows s={cart.summary} free={settings.shipping.freeShippingThreshold} />
          <Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={!addressId || placing || cart.hasIssues} onClick={place}>{placing ? 'Placing order…' : `Place order · ${formatCurrency(cart.summary.total)}`}</Button>
          {cart.hasIssues && <Typography variant="caption" color="error">Resolve cart issues before placing your order.</Typography>}
        </CardContent></Card>
      </Box>
      <AddressDialog open={dialog} onClose={() => setDialog(false)} onSaved={() => { addresses.reload(); setAddressId(''); }} />
    </Container>
  );
}
