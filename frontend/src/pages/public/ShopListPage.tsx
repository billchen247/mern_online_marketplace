import { Avatar, Box, Card, CardActionArea, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { Pager } from '../../components/common';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { imageUrl } from '../../utils/format';

export default function ShopListPage() {
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