import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';
import {
  Alert, Avatar, Box, Breadcrumbs, Button, Chip, Container, Divider, IconButton, Link, Pagination, Rating, Stack, Table, TableBody, TableCell, TableRow, TextField, Typography,
} from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useNotify } from '../../contexts/NotifyContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Product, Review } from '../../types';
import { clampQuantity } from '../../utils/pricing';
import { formatCurrency, formatDate, imageUrl } from '../../utils/format';
import { reviewFormSchema } from '../../validation/schemas';

type ReviewForm = { rating: number; title?: string; comment: string };

function ReviewSection({ productId, onChanged }: { productId: string; onChanged: () => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const reviews = useAsync(() => catalogApi.reviews(productId, page), [productId, page]);
  const mine = useAsync(() => (user ? catalogApi.reviewState(productId) : Promise.resolve(null)), [productId, user?.id]);
  const { run, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<ReviewForm>({ resolver: zodResolver(reviewFormSchema), defaultValues: { rating: 0, title: '', comment: '' } });

  const existing = mine.data?.review;
  const startEdit = () => {
    if (existing) form.reset({ rating: existing.rating, title: existing.title ?? '', comment: existing.comment });
    setEditing(true);
  };
  const submit = form.handleSubmit(async (v) => {
    const r = await run(() => (existing ? catalogApi.updateReview(existing._id, v) : catalogApi.createReview(productId, v)), existing ? 'Review updated' : 'Thanks for your review!');
    if (r) {
      setEditing(false);
      form.reset({ rating: 0, title: '', comment: '' });
      mine.reload();
      reviews.reload();
      onChanged();
    }
  });
  const remove = async () => {
    if (!existing) return;
    if ((await run(() => catalogApi.deleteReview(existing._id), 'Review deleted')) !== undefined) {
      setConfirmDelete(false);
      mine.reload();
      reviews.reload();
      onChanged();
    }
  };

  return (
    <Box component="section" aria-label="Reviews" sx={{ mt: 5 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700 }}>Customer reviews</Typography>
      {user && mine.data && (mine.data.eligible || editing) && (
        <Box component="form" onSubmit={submit} noValidate sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>{existing ? 'Edit your review' : 'Write a review'}</Typography>
          <Controller name="rating" control={form.control} render={({ field, fieldState }) => (
            <Box><Rating value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} aria-label="Your rating" />{fieldState.error && <Typography color="error" variant="caption" sx={{ display: 'block' }}>{fieldState.error.message}</Typography>}</Box>
          )} />
          <TextField {...form.register('title')} label="Title (optional)" size="small" fullWidth sx={{ my: 1 }} />
          <TextField {...form.register('comment')} label="Your review" multiline minRows={3} fullWidth size="small" error={Boolean(form.formState.errors.comment)} helperText={form.formState.errors.comment?.message} />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button type="submit" variant="contained" disabled={busy}>{existing ? 'Save changes' : 'Submit review'}</Button>
            {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
          </Stack>
        </Box>
      )}
      {user && existing && !editing && (
        <Alert severity="info" sx={{ mb: 2 }} action={<><Button size="small" onClick={startEdit}>Edit</Button><Button size="small" color="error" onClick={() => setConfirmDelete(true)}>Delete</Button></>}>
          You reviewed this product ({existing.rating}★).
        </Alert>
      )}
      {user && mine.data && !mine.data.hasPurchased && <Alert severity="info" sx={{ mb: 2 }}>Only buyers who have received this product can review it.</Alert>}
      {!user && <Alert severity="info" sx={{ mb: 2 }}><Link component={RouterLink} to="/login">Sign in</Link> to review products you purchased.</Alert>}
      <AsyncView state={reviews}>
        {(r) => r.data.length === 0 ? <EmptyState title="No reviews yet" description="Be the first to share your experience." /> : (
          <Stack spacing={2} divider={<Divider />}>
            {r.data.map((rv: Review) => (
              <Stack key={rv._id} direction="row" spacing={2} data-testid="review">
                <Avatar>{typeof rv.buyer === 'object' ? rv.buyer.name[0] : '?'}</Avatar>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Rating value={rv.rating} readOnly size="small" /><Typography variant="caption" color="text.secondary">{typeof rv.buyer === 'object' ? rv.buyer.name : ''} · {formatDate(rv.createdAt)}</Typography></Stack>
                  {rv.title && <Typography sx={{ fontWeight: 600 }}>{rv.title}</Typography>}
                  <Typography>{rv.comment}</Typography>
                </Box>
              </Stack>
            ))}
            {r.pagination.totalPages > 1 && <Pagination count={r.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />}
          </Stack>
        )}
      </AsyncView>
      <ConfirmDialog open={confirmDelete} title="Delete review?" message="Your review will be permanently removed." destructive confirmLabel="Delete" busy={busy} onClose={() => setConfirmDelete(false)} onConfirm={remove} />
    </Box>
  );
}

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => catalogApi.product(id), [id]);
  return (
    <Container sx={{ py: 3 }}>
      <AsyncView state={state} loadingLabel="Loading product…">
        {(p) => <Detail product={p as Product & { related: Product[] }} reload={state.reload} />}
      </AsyncView>
    </Container>
  );
}

function Detail({ product: p, reload }: { product: Product & { related: Product[] }; reload: () => void }) {
  const { user } = useAuth();
  const { add, wishlistIds, toggleWishlist } = useCart();
  const { success } = useNotify();
  const { run, busy } = useAction();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const shop = typeof p.shop === 'object' ? p.shop : null;
  const category = typeof p.category === 'object' ? p.category : null;
  const seller = typeof p.seller === 'object' ? p.seller : null;
  const wished = wishlistIds.has(p._id);
  const requireLogin = () => navigate('/login', { state: { from: `/products/${p._id}` } });

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/products" underline="hover" color="inherit">Products</Link>
        {category && <Link component={RouterLink} to={`/products?category=${category.slug}`} underline="hover" color="inherit">{category.name}</Link>}
        <Typography color="text.primary" noWrap>{p.name}</Typography>
      </Breadcrumbs>
      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Box>
          <Box component="img" src={imageUrl(p.images[active]?.url)} alt={p.name} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 2, bgcolor: 'action.hover' }} />
          {p.images.length > 1 && (
            <Stack direction="row" spacing={1} role="group" aria-label="Product images" sx={{ mt: 1 }}>
              {p.images.map((img, i) => (
                <Box key={i} component="button" type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}
                  sx={{ p: 0, border: 2, borderColor: i === active ? 'primary.main' : 'transparent', borderRadius: 1, cursor: 'pointer', width: 72, height: 72, overflow: 'hidden', bgcolor: 'transparent' }}>
                  <Box component="img" src={imageUrl(img.url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Rating value={p.ratingAverage} precision={0.1} readOnly aria-label={`Rated ${p.ratingAverage.toFixed(1)} out of 5`} />
            <Typography color="text.secondary">{p.ratingAverage.toFixed(1)} ({p.ratingCount} reviews)</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
            <Typography variant="h4" color="primary" data-testid="final-price" sx={{ fontWeight: 800 }}>{formatCurrency(p.finalPrice)}</Typography>
            {p.discount > 0 && <><Typography sx={{ textDecoration: 'line-through' }} color="text.secondary">{formatCurrency(p.price)}</Typography><Chip color="error" size="small" label={`Save ${p.discount}%`} /></>}
          </Stack>
          <Typography>{p.description}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {p.stock > 0 ? <Chip color={p.stock <= (p.lowStockThreshold ?? 5) ? 'warning' : 'success'} size="small" label={p.stock <= (p.lowStockThreshold ?? 5) ? `Only ${p.stock} left` : 'In stock'} /> : <Chip size="small" label="Out of stock" />}
            <Typography variant="body2" color="text.secondary">SKU: {p.sku}</Typography>
          </Stack>
          {shop && (
            <Typography variant="body2">Sold by <Link component={RouterLink} to={`/shops/${shop._id}`} sx={{ fontWeight: 600 }}>{shop.name}</Link>{seller ? <> · Seller: <Link component={RouterLink} to={`/shops?seller=${seller._id}`}>{seller.name}</Link></> : null}</Typography>
          )}
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField type="number" size="small" label="Quantity" value={qty} disabled={p.stock === 0} onChange={(e) => setQty(clampQuantity(Number(e.target.value), Math.max(p.stock, 1)))} slotProps={{ htmlInput: { min: 1, max: p.stock, 'aria-label': 'Quantity' } }} sx={{ width: 100 }} />
            <Button variant="contained" size="large" startIcon={<AddShoppingCart />} disabled={p.stock === 0 || busy}
              onClick={async () => { if (!user) return requireLogin(); await run(() => add(p._id, qty), 'Added to cart'); }}>Add to cart</Button>
            <IconButton aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} onClick={async () => { if (!user) return requireLogin(); const r = await run(() => toggleWishlist(p._id)); if (r !== undefined) success(r ? 'Added to wishlist' : 'Removed from wishlist'); }}>
              {wished ? <Favorite color="error" /> : <FavoriteBorder />}
            </IconButton>
          </Stack>
          {p.specifications.length > 0 && (
            <Box>
              <Typography variant="h6" component="h2" gutterBottom>Specifications</Typography>
              <Table size="small"><TableBody>{p.specifications.map((s) => <TableRow key={s.key}><TableCell component="th" sx={{ width: '35%', fontWeight: 600 }}>{s.key}</TableCell><TableCell>{s.value}</TableCell></TableRow>)}</TableBody></Table>
            </Box>
          )}
        </Stack>
      </Box>
      <ReviewSection productId={p._id} onChanged={reload} />
      {p.related?.length > 0 && (
        <Box component="section" aria-label="Related products" sx={{ mt: 5 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>Related products</Typography>
          <Box sx={productGridSx}>{p.related.slice(0, 4).map((r) => <ProductCard key={r._id} product={r} />)}</Box>
        </Box>
      )}
    </>
  );
}
