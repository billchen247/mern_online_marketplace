import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import { Box, Card, CardActionArea, CardContent, Chip, IconButton, Rating, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotify } from '../contexts/NotifyContext';
import type { Product } from '../types';
import { getErrorMessage } from '../utils/errors';
import { formatCurrency, imageUrl } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { wishlistIds, toggleWishlist } = useCart();
  const { success, error } = useNotify();
  const navigate = useNavigate();
  const wished = wishlistIds.has(product._id);
  const shopName = typeof product.shop === 'string' ? '' : product.shop.name;

  const onWish = async () => {
    if (!user) return navigate('/login', { state: { from: '/wishlist' } });
    try {
      const added = await toggleWishlist(product._id);
      success(added ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (e) {
      error(getErrorMessage(e));
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }} data-testid="product-card">
      <IconButton
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        onClick={onWish}
        size="small"
        sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'background.paper', zIndex: 1, '&:hover': { bgcolor: 'background.paper' } }}
      >
        {wished ? <Favorite color="error" fontSize="small" /> : <FavoriteBorder fontSize="small" />}
      </IconButton>
      <CardActionArea component={RouterLink} to={`/products/${product._id}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box component="img" src={imageUrl(product.images?.[0]?.url)} alt={product.name} loading="lazy" sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', bgcolor: 'action.hover' }} />
        <CardContent sx={{ flexGrow: 1 }}>
          {shopName && <Typography variant="caption" color="text.secondary">{shopName}</Typography>}
          <Typography variant="subtitle2" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
            {product.name}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Rating value={product.ratingAverage} precision={0.5} size="small" readOnly aria-label={`Rated ${product.ratingAverage.toFixed(1)} out of 5`} />
            <Typography variant="caption" color="text.secondary">({product.ratingCount})</Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'baseline', mt: 0.5, flexWrap: 'wrap' }}>
            <Typography color="primary" sx={{ fontWeight: 700 }}>{formatCurrency(product.finalPrice)}</Typography>
            {product.discount > 0 && (
              <>
                <Typography variant="body2" sx={{ textDecoration: 'line-through' }} color="text.secondary">{formatCurrency(product.price)}</Typography>
                <Chip size="small" color="error" label={`-${product.discount}%`} />
              </>
            )}
          </Stack>
          {!product.inStock && <Chip size="small" label="Out of stock" sx={{ mt: 0.5 }} />}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export const productGridSx = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } } as const;
