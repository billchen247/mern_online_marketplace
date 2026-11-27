import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { adminApi } from '../../api/services';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatCard, StatusChip, TrendChart, statGrid } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency } from '../../utils/format';

export function AdminDashboardPage() {
  const state = useAsync(() => adminApi.dashboard(), []);
  return (
    <>
      <PageHeader title="Admin dashboard" />
      <AsyncView state={state}>
        {(d) => (
          <Stack spacing={3}>
            <Box sx={statGrid}>
              <StatCard label="Users" value={d.totalUsers} />
              <StatCard label="Sellers" value={d.totalSellers} />
              <StatCard label="Shops" value={d.totalShops} />
              <StatCard label="Products" value={d.totalProducts} />
              <StatCard label="Orders" value={d.totalOrders} />
              <StatCard label="Gross sales" value={formatCurrency(d.grossSales)} />
              <StatCard label="Commission earned" value={formatCurrency(d.commissions)} />
              <StatCard label="Pending applications" value={d.pendingSellerApplications} />
              <StatCard label="Pending returns" value={d.pendingReturns} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Sales — last 14 days</Typography>
              <TrendChart data={d.salesTrend} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Recent orders</Typography>
              {d.recentOrders.map((o) => (
                <Stack key={o._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
                  <Link component={RouterLink} to={`/admin/orders/${o._id}`}>
                    {o.orderNumber}
                  </Link>
                  <StatusChip status={o.orderStatus} />
                  <Typography variant="body2">{formatCurrency(o.total)}</Typography>
                </Stack>
              ))}
            </Paper>
          </Stack>
        )}
      </AsyncView>
    </>
  );
}
