import Add from '@mui/icons-material/Add';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { imageUrl } from '../../utils/format';
export function SellerShopsPage() {
  const state = useAsync(() => sellerApi.shops(), []);
  const { run, busy } = useAction();
  const [del, setDel] = useState<{ _id: string; name: string } | null>(null);
  return (
    <>
      <PageHeader
        title="My shops"
        actions={
          <Button component={RouterLink} to="/seller/shops/new" variant="contained" startIcon={<Add />}>
            Create shop
          </Button>
        }
      />
      <AsyncView state={state}>
        {(shops) =>
          shops.length === 0 ? (
            <EmptyState title="You have no shops yet" description="Create your first shop to start listing products." />
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              {shops.map((s) => (
                <Card key={s._id} variant="outlined" data-testid="shop-card">
                  <CardContent>
                    <Stack direction="row" spacing={2}>
                      <Box
                        component="img"
                        src={imageUrl(s.logo?.url)}
                        alt=""
                        sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 700 }}>
                          {s.name}
                        </Typography>
                        <StatusChip status={s.status} />
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                          {s.description}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" component={RouterLink} to={`/seller/shops/${s._id}`}>
                        Edit
                      </Button>
                      <Button size="small" component={RouterLink} to={`/shops/${s._id}`}>
                        View storefront
                      </Button>
                      {s.status !== 'inactive' && (
                        <Button size="small" color="error" onClick={() => setDel(s)}>
                          Deactivate
                        </Button>
                      )}
                      {s.status === 'inactive' && (
                        <Button
                          size="small"
                          onClick={async () => {
                            if (await run(() => sellerApi.updateShop(s._id, { status: 'active' }), 'Shop reactivated')) state.reload();
                          }}
                        >
                          Reactivate
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )
        }
      </AsyncView>
      <ConfirmDialog
        open={Boolean(del)}
        title="Deactivate shop?"
        message={`“${del?.name}” and its products will be hidden from buyers. You can reactivate it later.`}
        destructive
        confirmLabel="Deactivate"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (del && (await run(() => sellerApi.deleteShop(del._id), 'Shop deactivated'))) {
            setDel(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
