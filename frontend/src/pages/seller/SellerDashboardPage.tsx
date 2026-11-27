import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatCard, StatusChip, TrendChart, statGrid } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency } from '../../utils/format';
export function SellerDashboardPage() {
  const state = useAsync(() => sellerApi.dashboard(), []);
  return (
    <>
      <PageHeader title="Seller dashboard" subtitle="Figures are calculated from your own shops’ orders." />
      <AsyncView state={state}>
        {(d) => (
          <Stack spacing={3}>
            <Box sx={statGrid}>
              <StatCard label="Total sales" value={formatCurrency(d.totalSales)} />
              <StatCard label="Orders" value={d.orderCount} />
              <StatCard label="Products" value={d.productCount} />
              <StatCard label="Shops" value={d.shopCount} />
              <StatCard label="Pending orders" value={d.pendingOrders} />
              <StatCard label="Completed orders" value={d.completedOrders} />
              <StatCard label="Low-stock products" value={d.lowStockProducts.length} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Sales — last 14 days</Typography>
              <TrendChart data={d.salesTrend} />
            </Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Recent orders</Typography>
                {d.recentOrders.length === 0 ? (
                  <Typography color="text.secondary">No orders yet.</Typography>
                ) : (
                  d.recentOrders.map((o) => (
                    <Stack key={o._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
                      <Link component={RouterLink} to={`/seller/orders/${o._id}`}>
                        {o.orderNumber}
                      </Link>
                      <StatusChip status={o.fulfillmentStatus} />
                      <Typography variant="body2">{formatCurrency(o.subtotal)}</Typography>
                    </Stack>
                  ))
                )}
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Low stock</Typography>
                {d.lowStockProducts.length === 0 ? (
                  <Typography color="text.secondary">All products are well stocked.</Typography>
                ) : (
                  d.lowStockProducts.map((p) => (
                    <Stack key={p._id} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
                      <Link component={RouterLink} to={`/seller/products/${p._id}`}>
                        {p.name}
                      </Link>
                      <Chip
                        size="small"
                        color={p.stock === 0 ? 'error' : 'warning'}
                        label={p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                      />
                    </Stack>
                  ))
                )}
              </Paper>
            </Box>
          </Stack>
        )}
      </AsyncView>
    </>
  );
}
