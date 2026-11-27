import { Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useState } from 'react';
import { sellerApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function SellerPayoutsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => sellerApi.payouts(page), [page]);
  return (
    <>
      <PageHeader title="Payout history" subtitle="Simulated payouts only." />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No payouts yet" description="Request a simulated payout from the Earnings page once orders are delivered." />
          ) : (
            <>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                        <TableCell>{p.reference}</TableCell>
                        <TableCell>
                          <StatusChip status={p.status} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(p.amount)}</TableCell>
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
