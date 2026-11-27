import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/DeleteOutlined';
import {
  Box,
  Button,
  Chip,
  IconButton,
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
import { Link as RouterLink } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Product } from '../../types';
import { formatCurrency, imageUrl } from '../../utils/format';

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
      <PageHeader
        title="Products"
        actions={
          <Button component={RouterLink} to="/seller/products/new" variant="contained" startIcon={<Add />}>
            Add product
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search products"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          size="small"
          label="Shop"
          value={shop}
          onChange={(e) => {
            setShop(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All shops</MenuItem>
          {(shops.data ?? []).map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No products" description="Add your first product to start selling." />
          ) : (
            <>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Shop</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((p) => (
                      <TableRow key={p._id} hover data-testid="product-row">
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Box
                              component="img"
                              src={imageUrl(p.images[0]?.url)}
                              alt=""
                              sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: 'cover' }}
                            />
                            <Box>
                              <Link component={RouterLink} to={`/seller/products/${p._id}`}>
                                {p.name}
                              </Link>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {p.sku}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{typeof p.shop === 'object' ? p.shop.name : ''}</TableCell>
                        <TableCell align="right">{formatCurrency(p.finalPrice)}</TableCell>
                        <TableCell align="right">
                          {p.stock === 0 ? (
                            <Chip size="small" color="error" label="Out of stock" />
                          ) : p.stock <= (p.lowStockThreshold ?? 5) ? (
                            <Chip size="small" color="warning" label={`${p.stock} low`} />
                          ) : (
                            p.stock
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={p.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" component={RouterLink} to={`/seller/products/${p._id}`}>
                            Edit
                          </Button>
                          <IconButton size="small" color="error" aria-label={`Delete ${p.name}`} onClick={() => setDel(p)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
      <ConfirmDialog
        open={Boolean(del)}
        title="Delete product?"
        message={`“${del?.name}” will be removed from the marketplace. Past orders keep their snapshot.`}
        destructive
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (del && (await run(() => sellerApi.deleteProduct(del._id), 'Product deleted')) !== undefined) {
            setDel(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
