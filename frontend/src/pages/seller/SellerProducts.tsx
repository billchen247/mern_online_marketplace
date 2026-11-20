import { zodResolver } from '@hookform/resolvers/zod';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/DeleteOutlined';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { catalogApi, sellerApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormText } from '../../components/FormFields';
import { ImageUploader } from '../../components/ImageUploader';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { ImageRef, Product } from '../../types';
import { formatCurrency, formatDateTime, imageUrl } from '../../utils/format';
import { productFormSchema } from '../../validation/schemas';

const shopId = (p: Product) => (typeof p.shop === 'string' ? p.shop : p.shop._id);
const catId = (p: Product) => (typeof p.category === 'string' ? p.category : p.category._id);

export function SellerProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [shop, setShop] = useState('');
  const dq = useDebounce(search);
  const shops = useAsync(() => sellerApi.shops(), []);
  const state = useAsync(() => sellerApi.products({ page, limit: 10, search: dq || undefined, shop: shop || undefined }), [page, dq, shop]);
  const { run, busy } = useAction();
  const [del, setDel] = useState<Product | null>(null);
  return (
    <>
      <PageHeader title="Products" actions={<Button component={RouterLink} to="/seller/products/new" variant="contained" startIcon={<Add />}>Add product</Button>} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <TextField select size="small" label="Shop" value={shop} onChange={(e) => { setShop(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}><MenuItem value="">All shops</MenuItem>{(shops.data ?? []).map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}</TextField>
      </Stack>
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No products" description="Add your first product to start selling." /> : (
          <>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>Shop</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Stock</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>{r.data.map((p) => (
                <TableRow key={p._id} hover data-testid="product-row">
                  <TableCell><Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><Box component="img" src={imageUrl(p.images[0]?.url)} alt="" sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: 'cover' }} /><Box><Link component={RouterLink} to={`/seller/products/${p._id}`}>{p.name}</Link><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{p.sku}</Typography></Box></Stack></TableCell>
                  <TableCell>{typeof p.shop === 'object' ? p.shop.name : ''}</TableCell>
                  <TableCell align="right">{formatCurrency(p.finalPrice)}</TableCell>
                  <TableCell align="right">{p.stock === 0 ? <Chip size="small" color="error" label="Out of stock" /> : p.stock <= (p.lowStockThreshold ?? 5) ? <Chip size="small" color="warning" label={`${p.stock} low`} /> : p.stock}</TableCell>
                  <TableCell><StatusChip status={p.status} /></TableCell>
                  <TableCell align="right"><Button size="small" component={RouterLink} to={`/seller/products/${p._id}`}>Edit</Button><IconButton size="small" color="error" aria-label={`Delete ${p.name}`} onClick={() => setDel(p)}><Delete fontSize="small" /></IconButton></TableCell>
                </TableRow>))}</TableBody></Table></Paper>
            <Pager pagination={r.pagination} onChange={setPage} />
          </>
        )}
      </AsyncView>
      <ConfirmDialog open={Boolean(del)} title="Delete product?" message={`“${del?.name}” will be removed from the marketplace. Past orders keep their snapshot.`} destructive confirmLabel="Delete" busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => sellerApi.deleteProduct(del._id), 'Product deleted')) !== undefined) { setDel(null); state.reload(); } }} />
    </>
  );
}

type PForm = { shop: string; category: string; name: string; description: string; price: number; discount: number; stock: number; sku: string; status: 'draft' | 'active' | 'inactive'; specifications: { key: string; value: string }[] };
export function SellerProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const shops = useAsync(() => sellerApi.shops(), []);
  const cats = useAsync(() => catalogApi.categories(), []);
  const existing = useAsync(() => (editing ? sellerApi.product(id!) : Promise.resolve(null)), [id]);
  const [images, setImages] = useState<ImageRef[]>([]);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PForm>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: { shop: '', category: '', name: '', description: '', price: 0, discount: 0, stock: 0, sku: '', status: 'active', specifications: [] },
  });
  const spec = useFieldArray({ control, name: 'specifications' });
  useEffect(() => {
    const p = existing.data;
    if (p) { reset({ shop: shopId(p), category: catId(p), name: p.name, description: p.description, price: p.price, discount: p.discount, stock: p.stock, sku: p.sku, status: p.status === 'draft' || p.status === 'inactive' ? p.status : 'active', specifications: p.specifications }); setImages(p.images); }
  }, [existing.data, reset]);
  const submit = handleSubmit(async (v) => {
    const r = await run(() => (editing ? sellerApi.updateProduct(id!, { ...v, images }) : sellerApi.createProduct({ ...v, images })), editing ? 'Product updated' : 'Product created');
    if (r) navigate('/seller/products');
  });
  const noShops = shops.data && shops.data.length === 0;
  return (
    <>
      <PageHeader title={editing ? 'Edit product' : 'Add product'} />
      {noShops && <Alert severity="warning" sx={{ mb: 2 }}>You need a shop before adding products. <Link component={RouterLink} to="/seller/shops/new">Create a shop</Link></Alert>}
      <AsyncView state={existing} allowNull>
        {(p) => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 760 }}>
            <Stack spacing={2}>
              {p && Boolean(p.status === 'blocked') && <Alert severity="error">This product was blocked by a moderator and cannot be sold.</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="shop" control={control} render={({ field, fieldState }) => <TextField select fullWidth size="small" label="Shop" {...field} disabled={editing} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>{(shops.data ?? []).filter((s) => s.status !== 'suspended').map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}</TextField>} />
                <Controller name="category" control={control} render={({ field, fieldState }) => <TextField select fullWidth size="small" label="Category" {...field} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>{(cats.data ?? []).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}</TextField>} />
              </Stack>
              <FormText label="Product name" fieldError={errors.name} {...register('name')} />
              <FormText label="Description" multiline minRows={4} fieldError={errors.description} {...register('description')} />
              <ImageUploader label="Product images" value={images} onChange={setImages} max={8} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormText label="Price (USD)" type="number" slotProps={{ htmlInput: { step: '0.01', min: 0 } }} fieldError={errors.price} {...register('price', { valueAsNumber: true })} />
                <FormText label="Discount (%)" type="number" slotProps={{ htmlInput: { min: 0, max: 90 } }} fieldError={errors.discount} {...register('discount', { valueAsNumber: true })} />
                <FormText label="Stock" type="number" slotProps={{ htmlInput: { min: 0 } }} fieldError={errors.stock} {...register('stock', { valueAsNumber: true })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormText label="SKU" fieldError={errors.sku} {...register('sku')} />
                <Controller name="status" control={control} render={({ field }) => <TextField select fullWidth size="small" label="Status" {...field}><MenuItem value="active">Active</MenuItem><MenuItem value="draft">Draft</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>} />
              </Stack>
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography sx={{ fontWeight: 600 }}>Specifications</Typography><Button size="small" startIcon={<Add />} onClick={() => spec.append({ key: '', value: '' })}>Add</Button></Stack>
                {spec.fields.map((f, i) => (
                  <Stack key={f.id} direction="row" spacing={1} sx={{ mt: 1 }}>
                    <FormText label="Name" fieldError={errors.specifications?.[i]?.key} {...register(`specifications.${i}.key`)} />
                    <FormText label="Value" fieldError={errors.specifications?.[i]?.value} {...register(`specifications.${i}.value`)} />
                    <IconButton aria-label={`Remove specification ${i + 1}`} onClick={() => spec.remove(i)}><Delete /></IconButton>
                  </Stack>
                ))}
              </Box>
              <Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={busy || Boolean(noShops)}>{editing ? 'Save changes' : 'Create product'}</Button><Button component={RouterLink} to="/seller/products">Cancel</Button></Stack>
            </Stack>
          </Box>
        )}
      </AsyncView>
    </>
  );
}

function StockDialog({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'adjustment' | 'set'>('adjustment');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const history = useAsync(() => (product ? sellerApi.inventory(product._id) : Promise.resolve([])), [product?._id]);
  const { run, busy } = useAction();
  useEffect(() => { setValue(''); setNote(''); }, [product?._id]);
  if (!product) return null;
  const n = Number(value);
  const invalid = value === '' || !Number.isInteger(n) || (mode === 'adjustment' ? n === 0 : n < 0);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="stock-title">
      <DialogTitle id="stock-title">Inventory · {product.name}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>Current stock: <b>{product.stock}</b></Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField select size="small" label="Action" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} sx={{ minWidth: 160 }}><MenuItem value="adjustment">Adjust by (+/−)</MenuItem><MenuItem value="set">Set to</MenuItem></TextField>
          <TextField size="small" type="number" label={mode === 'adjustment' ? 'Amount' : 'New quantity'} value={value} onChange={(e) => setValue(e.target.value)} />
          <TextField size="small" label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        </Stack>
        <Typography variant="subtitle2">History</Typography>
        {history.data?.length ? history.data.slice(0, 8).map((h) => <Typography key={h._id} variant="body2" color="text.secondary">{formatDateTime(h.createdAt)} · {h.delta > 0 ? '+' : ''}{h.delta} → {h.stockAfter} ({h.reason}{h.note ? `: ${h.note}` : ''})</Typography>) : <Typography variant="body2" color="text.secondary">No history yet.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={invalid || busy} onClick={async () => { if (await run(() => sellerApi.adjustStock(product._id, { [mode]: n, note: note || undefined }), 'Stock updated')) { onDone(); onClose(); } }}>Apply</Button></DialogActions>
    </Dialog>
  );
}

export function SellerInventoryPage() {
  const [page, setPage] = useState(1);
  const [low, setLow] = useState(false);
  const state = useAsync(() => sellerApi.products({ page, limit: 15, lowStock: low || undefined }), [page, low]);
  const [sel, setSel] = useState<Product | null>(null);
  return (
    <>
      <PageHeader title="Inventory" subtitle="Adjust stock levels. Changes are atomic and logged." actions={<Button variant={low ? 'contained' : 'outlined'} onClick={() => { setLow(!low); setPage(1); }}>{low ? 'Showing low stock' : 'Show low stock only'}</Button>} />
      <AsyncView state={state}>
        {(r) => r.data.length === 0 ? <EmptyState title="No products" /> : (
          <><Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>SKU</TableCell><TableCell align="right">Stock</TableCell><TableCell>Level</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{r.data.map((p) => <TableRow key={p._id} data-testid="inventory-row"><TableCell>{p.name}</TableCell><TableCell>{p.sku}</TableCell><TableCell align="right">{p.stock}</TableCell><TableCell>{p.stock === 0 ? <Chip size="small" color="error" label="Out of stock" /> : p.stock <= (p.lowStockThreshold ?? 5) ? <Chip size="small" color="warning" label="Low stock" /> : <Chip size="small" color="success" label="OK" />}</TableCell><TableCell align="right"><Button size="small" onClick={() => setSel(p)}>Adjust stock</Button></TableCell></TableRow>)}</TableBody></Table></Paper>
            <Pager pagination={r.pagination} onChange={setPage} /></>
        )}
      </AsyncView>
      <StockDialog product={sel} onClose={() => setSel(null)} onDone={state.reload} />
    </>
  );
}
