import { Avatar, Box, Card, CardActionArea, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { Pager } from '../../components/common';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { imageUrl } from '../../utils/format';

export function ShopListPage() {
  const [sp] = useSearchParams();
  const seller = sp.get('seller') ?? undefined;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(search);
  const state = useAsync(() => catalogApi.shops({ page, limit: 12, search: dq, seller }), [dq, page, seller]);
  return (
    <Container sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {seller ? 'Seller’s shops' : 'Shops'}
        </Typography>
        <TextField
          size="small"
          label="Search shops"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Stack>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No shops found" />
          ) : (
            <>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
                {r.data.map((s) => (
                  <Card key={s._id} variant="outlined">
                    <CardActionArea component={RouterLink} to={`/shops/${s._id}`}>
                      <CardContent>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Avatar src={s.logo ? imageUrl(s.logo.url) : undefined} sx={{ width: 56, height: 56 }}>
                            {s.name[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontWeight: 700 }}>
                              {s.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                              {s.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
    </Container>
  );
}

export function ShopDetailPage() {
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
