import Delete from '@mui/icons-material/DeleteOutlined';
import { Alert, Box, Button, Card, CardContent, Container, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAction } from '../../hooks/useAction';
import type { Cart } from '../../types';
import { clampQuantity } from '../../utils/pricing';
import { formatCurrency, imageUrl } from '../../utils/format';
import { EmptyState, Loading } from '../../components/StateViews';

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

export default function CartPage() {
  const { cart, loading, update, remove, clear, refresh } = useCart();
  const { settings } = useSettings();
  const { run, busy } = useAction();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | undefined>();

  if (!cart && loading) return <Loading label="Loading cart…" />;
  if (!cart || cart.items.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <EmptyState
          title="Your cart is empty"
          description="Browse the marketplace and add something you love."
          action={
            <Button component={RouterLink} to="/products" variant="contained">
              Start shopping
            </Button>
          }
        />
      </Container>
    );
  }
  const shops = new Set(cart.items.map((i) => i.product?.shop.id));
  return (
    <Container sx={{ py: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Shopping cart
        </Typography>
        <Button color="error" onClick={() => run(() => clear(), 'Cart cleared')} disabled={busy}>
          Clear cart
        </Button>
      </Stack>
      {cart.hasIssues && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some items need attention before you can check out.
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={1.5}>
          {cart.items.map((i) => (
            <Card key={i.id} variant="outlined" data-testid="cart-item">
              <CardContent>
                <Stack direction="row" spacing={2}>
                  <Box
                    component="img"
                    src={imageUrl(i.product?.image)}
                    alt={i.product?.name ?? 'Unavailable'}
                    sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component={i.product ? RouterLink : 'span'}
                      {...(i.product ? { to: `/products/${i.product.id}` } : {})}
                      sx={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}
                    >
                      {i.product?.name ?? 'Unavailable product'}
                    </Typography>
                    {i.product && (
                      <Typography variant="body2" color="text.secondary">
                        Sold by {i.product.shop.name}
                      </Typography>
                    )}
                    {i.issue && (
                      <Typography variant="body2" color="error" role="alert">
                        {i.issue}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1 }}>
                      <TextField
                        type="number"
                        size="small"
                        label="Qty"
                        value={i.quantity}
                        disabled={busy || !i.product}
                        sx={{ width: 84 }}
                        slotProps={{
                          htmlInput: { min: 1, max: i.product?.stock, 'aria-label': `Quantity for ${i.product?.name ?? 'item'}` },
                        }}
                        onChange={(e) =>
                          i.product && run(() => update(i.id, clampQuantity(Number(e.target.value), Math.max(i.product!.stock, 1))))
                        }
                      />
                      <IconButton
                        aria-label={`Remove ${i.product?.name ?? 'item'}`}
                        onClick={() => run(() => remove(i.id), 'Item removed')}
                        disabled={busy}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Box>
                  {i.product && <Typography sx={{ fontWeight: 700 }}>{formatCurrency(i.product.finalPrice * i.quantity)}</Typography>}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Order summary
            </Typography>
            {shops.size > 1 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Your cart has items from {shops.size} shops. They’ll be checked out together and fulfilled separately by each seller.
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField size="small" label="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} fullWidth />
              <Button
                variant="outlined"
                onClick={async () => {
                  const c = await refresh(coupon.trim() || undefined);
                  setApplied(c?.summary.couponCode ?? undefined);
                }}
              >
                Apply
              </Button>
            </Stack>
            {applied && (
              <Typography variant="caption" color="success.main">
                Coupon {applied} applied
              </Typography>
            )}
            <SummaryRows s={cart.summary} free={settings.shipping.freeShippingThreshold} />
            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              disabled={cart.hasIssues}
              onClick={() => navigate('/checkout', { state: { coupon: applied } })}
            >
              Proceed to checkout
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
