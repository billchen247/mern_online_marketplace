import { Alert, Box, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { sellerApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatCard, StatusChip, statGrid } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function SellerEarningsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => sellerApi.earnings(page), [page]);
  const { run, busy } = useAction();
  return (
    <>
      <PageHeader
        title="Earnings"
        subtitle="All financial figures are simulated — no real money moves."
        actions={
          <Button
            variant="contained"
            disabled={busy || !state.data || state.data.availableForPayout <= 0}
            onClick={async () => {
              if (await run(() => sellerApi.requestPayout(), 'Simulated payout created')) state.reload();
            }}
          >
            Request simulated payout
          </Button>
        }
      />
      <AsyncView state={state}>
        {(e) => (
          <Stack spacing={3}>
            <Alert severity="info">
              Simulated data: commission is deducted per order using the marketplace commission rate in effect at purchase time.
            </Alert>
            <Box sx={statGrid}>
              <StatCard label="Gross sales" value={formatCurrency(e.grossSales)} />
              <StatCard label="Marketplace commission" value={formatCurrency(e.marketplaceCommission)} />
              <StatCard label="Net earnings" value={formatCurrency(e.netEarnings)} />
              <StatCard label="Pending earnings" value={formatCurrency(e.pendingEarnings)} hint="Until delivered" />
              <StatCard label="Completed earnings" value={formatCurrency(e.completedEarnings)} />
              <StatCard label="Available for payout" value={formatCurrency(e.availableForPayout)} />
            </Box>
            <Typography variant="h6">Commission history</Typography>
            {e.commissionHistory.length === 0 ? (
              <EmptyState title="No commission records yet" />
            ) : (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Order</TableCell>
                      <TableCell align="right">Gross</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Commission</TableCell>
                      <TableCell align="right">Net</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {e.commissionHistory.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                        <TableCell>{typeof c.sellerOrder === 'object' ? c.sellerOrder.orderNumber : ''}</TableCell>
                        <TableCell align="right">{formatCurrency(c.grossAmount)}</TableCell>
                        <TableCell align="right">{c.commissionRate}%</TableCell>
                        <TableCell align="right">{formatCurrency(c.commissionAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(c.netAmount)}</TableCell>
                        <TableCell>
                          <StatusChip status={c.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
            <Pager pagination={e.pagination} onChange={setPage} />
          </Stack>
        )}
      </AsyncView>
    </>
  );
}
