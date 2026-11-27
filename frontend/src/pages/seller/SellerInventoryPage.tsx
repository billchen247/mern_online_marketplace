import { Button, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useState } from 'react';
import { sellerApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import type { Product } from '../../types';

import { StockDialog } from './StockDialog';

export function SellerInventoryPage() {
  const [page, setPage] = useState(1);
  const [low, setLow] = useState(false);
  const state = useAsync(() => sellerApi.products({ page, limit: 15, lowStock: low || undefined }), [page, low]);
  const [sel, setSel] = useState<Product | null>(null);
  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Adjust stock levels. Changes are atomic and logged."
        actions={
          <Button
            variant={low ? 'contained' : 'outlined'}
            onClick={() => {
              setLow(!low);
              setPage(1);
            }}
          >
            {low ? 'Showing low stock' : 'Show low stock only'}
          </Button>
        }
      />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No products" />
          ) : (
            <>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((p) => (
                      <TableRow key={p._id} data-testid="inventory-row">
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.sku}</TableCell>
                        <TableCell align="right">{p.stock}</TableCell>
                        <TableCell>
                          {p.stock === 0 ? (
                            <Chip size="small" color="error" label="Out of stock" />
                          ) : p.stock <= (p.lowStockThreshold ?? 5) ? (
                            <Chip size="small" color="warning" label="Low stock" />
                          ) : (
                            <Chip size="small" color="success" label="OK" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => setSel(p)}>
                            Adjust stock
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
      <StockDialog product={sel} onClose={() => setSel(null)} onDone={state.reload} />
    </>
  );
}
