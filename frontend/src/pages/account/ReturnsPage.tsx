import { Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { orderApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function ReturnsPage() {
  const state = useAsync(() => orderApi.returns(), []);
  return (
    <>
      <PageHeader title="Return requests" />
      <AsyncView state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState title="No return requests" description="You can request a return from a delivered order." />
          ) : (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Requested</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Refund</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell>{typeof r.order === 'object' ? r.order.orderNumber : ''}</TableCell>
                      <TableCell>{r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell>
                        <StatusChip status={r.status} />
                      </TableCell>
                      <TableCell align="right">{r.status === 'refunded' ? `${formatCurrency(r.refundAmount)} (simulated)` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        }
      </AsyncView>
    </>
  );
}
