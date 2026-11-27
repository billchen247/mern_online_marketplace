import { Link, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const state = useAsync(() => sellerApi.orders({ page, limit: 10, status: status || undefined }), [page, status]);
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Only orders containing your products are shown."
        actions={
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((o) => (
                      <TableRow key={o._id} hover data-testid="seller-order-row">
                        <TableCell>
                          <Link component={RouterLink} to={`/seller/orders/${o._id}`}>
                            {o.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                        <TableCell>{typeof o.buyer === 'object' ? o.buyer.name : ''}</TableCell>
                        <TableCell>{o.items.length}</TableCell>
                        <TableCell>
                          <StatusChip status={o.fulfillmentStatus} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(o.subtotal)}</TableCell>
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
