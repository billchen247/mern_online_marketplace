import { Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { name, tableSx } from './AdminShared';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Order } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

import { Filters } from './Filters';
import { StatusFilter } from './StatusFilter';
export function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.orders({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  return (
    <>
      <PageHeader title="Orders" />
      <Filters>
        <TextField
          size="small"
          label="Search order number"
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
          options={[
            'pending',
            'paid',
            'processing',
            'partially_fulfilled',
            'shipped',
            'delivered',
            'cancelled',
            'refunded',
            'partially_refunded',
          ]}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <>
              <Paper variant="outlined" sx={tableSx}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Payment</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((o: Order) => (
                      <TableRow key={o._id} hover data-testid="admin-order-row">
                        <TableCell>
                          <Link component={RouterLink} to={`/admin/orders/${o._id}`}>
                            {o.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                        <TableCell>{name(o.buyer)}</TableCell>
                        <TableCell>
                          <StatusChip status={o.orderStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusChip status={o.paymentStatus} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(o.total)}</TableCell>
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
