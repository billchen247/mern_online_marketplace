import { Box, Button, Card, CardContent, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { orderApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { Pager, PageHeader, StatusChip } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { formatCurrency, formatDateTime, imageUrl } from '../../utils/format';

export function OrderListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const state = useAsync(() => orderApi.list(page, status || undefined), [page, status]);
  return (
    <>
      <PageHeader
        title="My orders"
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
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_fulfilled', 'refunded'].map((s) => (
              <MenuItem key={s} value={s}>
                {s.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState
              title="No orders yet"
              action={
                <Button component={RouterLink} to="/products" variant="contained">
                  Start shopping
                </Button>
              }
            />
          ) : (
            <Stack spacing={1.5}>
              {r.data.map((o) => (
                <Card key={o._id} variant="outlined" data-testid="order-row">
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                      <Box>
                        <Link component={RouterLink} to={`/account/orders/${o._id}`} sx={{ fontWeight: 700 }}>
                          {o.orderNumber}
                        </Link>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(o.createdAt)} · {o.itemCount ?? 0} items
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                          {o.preview?.map((p, i) => (
                            <Box
                              key={i}
                              component="img"
                              src={imageUrl(p.image)}
                              alt={p.name}
                              title={p.name}
                              sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 0.5 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Stack spacing={0.5} sx={{ alignItems: { sm: 'flex-end' } }}>
                        <StatusChip status={o.orderStatus} />
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrency(o.total)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              <Pager pagination={r.pagination} onChange={setPage} />
            </Stack>
          )
        }
      </AsyncView>
    </>
  );
}
