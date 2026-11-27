import { Avatar, Box, Container, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { Pager } from '../../components/common';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAsync } from '../../hooks/useAsync';
import { imageUrl } from '../../utils/format';

export default function ShopDetailPage() {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const shop = useAsync(() => catalogApi.shop(id), [id]);
  const products = useAsync(() => catalogApi.products({ shop: id, page, limit: 12 }), [id, page]);
  return (
    <Box>
      <AsyncView state={shop}>
        {(s) => (
          <>
            <Box
              sx={{
                height: { xs: 140, md: 220 },
                bgcolor: 'primary.main',
                backgroundImage: s.banner ? `url(${imageUrl(s.banner.url)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              role="img"
              aria-label={`${s.name} banner`}
            />
            <Container sx={{ mt: -4 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', mb: 3 }}>
                <Avatar
                  src={s.logo ? imageUrl(s.logo.url) : undefined}
                  sx={{ width: 88, height: 88, border: 4, borderColor: 'background.paper' }}
                >
                  {s.name[0]}
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700, bgcolor: 'background.paper', px: 1, borderRadius: 1 }}>
                    {s.name}
                  </Typography>
                </Box>
              </Stack>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {s.description}
              </Typography>
              {s.contact?.email && (
                <Typography variant="body2">
                  Contact: {s.contact.email}
                  {s.contact.phone ? ` · ${s.contact.phone}` : ''}
                </Typography>
              )}
            </Container>
          </>
        )}
      </AsyncView>
      <Container sx={{ py: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          Products
        </Typography>
        <AsyncView state={products}>
          {(r) =>
            r.data.length === 0 ? (
              <EmptyState title="No products yet" />
            ) : (
              <>
                <Box sx={productGridSx}>
                  {r.data.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </Box>
                <Pager pagination={r.pagination} onChange={setPage} />
              </>
            )
          }
        </AsyncView>
      </Container>
    </Box>
  );
}