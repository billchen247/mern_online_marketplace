import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { name } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime } from '../../utils/format';

export function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => adminApi.reviews({ page }), [page]);
  const { run } = useAction();
  return (
    <>
      <PageHeader title="Review moderation" />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No reviews" />
          ) : (
            <>
              <Stack spacing={1.5}>
                {r.data.map((rv) => (
                  <Paper key={rv._id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {'★'.repeat(rv.rating)} {rv.title}
                        </Typography>
                        <Typography variant="body2">{rv.comment}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {name(rv.buyer)} on {name(rv.product)} · {formatDateTime(rv.createdAt)}
                        </Typography>
                      </Box>
                      <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
                        <StatusChip status={rv.status} />
                        <Button
                          size="small"
                          onClick={async () => {
                            if (
                              await run(
                                () => adminApi.moderateReview(rv._id, rv.status === 'hidden' ? 'published' : 'hidden'),
                                'Review updated',
                              )
                            )
                              state.reload();
                          }}
                        >
                          {rv.status === 'hidden' ? 'Restore' : 'Hide'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
    </>
  );
}
