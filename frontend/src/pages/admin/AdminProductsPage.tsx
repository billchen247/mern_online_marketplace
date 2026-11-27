import { Button, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { name, tableSx } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils/format';

import { Filters } from './Filters';
import { StatusFilter } from './StatusFilter';
export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.products({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  const { run } = useAction();
  const upd = async (p: Product, b: { status?: string; featured?: boolean }) => {
    if (await run(() => adminApi.updateProduct(p._id, b), 'Product updated')) state.reload();
  };
  return (
    <>
      <PageHeader title="Products" subtitle="Block policy-violating products or feature them on the home page." />
      <Filters>
        <TextField
          size="small"
          label="Search products"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['active', 'draft', 'inactive', 'blocked']}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No products" />
          ) : (
            <>
              <Paper variant="outlined" sx={tableSx}>
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
                      <TableRow key={p._id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{name(p.shop)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.finalPrice)}</TableCell>
                        <TableCell align="right">{p.stock}</TableCell>
                        <TableCell>
                          <StatusChip status={p.status} />
                          {p.featured && <Chip size="small" label="featured" sx={{ ml: 0.5 }} />}
                        </TableCell>
                        <TableCell align="right">
                          {p.status === 'blocked' ? (
                            <Button size="small" onClick={() => upd(p, { status: 'active' })}>
                              Unblock
                            </Button>
                          ) : (
                            <Button size="small" color="error" onClick={() => upd(p, { status: 'blocked' })}>
                              Block
                            </Button>
                          )}
                          <Button size="small" onClick={() => upd(p, { featured: !p.featured })}>
                            {p.featured ? 'Unfeature' : 'Feature'}
                          </Button>
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
    </>
  );
}
