import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { wishlistApi } from '../../api/services';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useCart } from '../../contexts/CartContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';

export default function WishlistPage() {
  const state = useAsync(() => wishlistApi.get(), []);
  const { refresh, refreshWishlist } = useCart();
  const { run, busy } = useAction();
  const move = async (id: string) => {
    if (await run(() => wishlistApi.moveToCart(id), 'Moved to cart')) { state.reload(); await refresh(); await refreshWishlist(); }
  };
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>My wishlist</Typography>
      <AsyncView state={state}>
        {(items) => items.length === 0 ? <EmptyState title="Your wishlist is empty" description="Tap the heart on any product to save it for later." action={<Button component={RouterLink} to="/products" variant="contained">Browse products</Button>} /> : (
          <Box sx={productGridSx}>
            {items.map((p) => (
              <Stack key={p._id} spacing={1}>
                <ProductCard product={p} />
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" size="small" disabled={busy || !p.inStock} onClick={() => move(p._id)}>{p.inStock ? 'Move to cart' : 'Out of stock'}</Button>
                  <Button size="small" color="error" disabled={busy} aria-label={`Remove ${p.name} from wishlist`} onClick={async () => { if (await run(() => wishlistApi.remove(p._id), 'Removed')) { state.reload(); await refreshWishlist(); } }}>Remove</Button>
                </Stack>
              </Stack>
            ))}
          </Box>
        )}
      </AsyncView>
    </Container>
  );
}
