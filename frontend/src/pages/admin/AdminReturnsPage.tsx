import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { name } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { ReturnRequest } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

import { Filters } from './Filters';
import { StatusFilter } from './StatusFilter';
export function AdminReturnsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('requested');
  const state = useAsync(() => adminApi.returns({ page, status: status || undefined }), [page, status]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ r: ReturnRequest; decision: 'approved' | 'rejected' | 'refunded' } | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <>
      <PageHeader title="Returns & refunds" subtitle="Refunds are simulated." />
      <Filters>
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['requested', 'approved', 'rejected', 'refunded']}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No return requests" />
          ) : (
            <>
              <Stack spacing={1.5}>
                {r.data.map((x) => (
                  <Paper key={x._id} variant="outlined" sx={{ p: 2 }} data-testid="return-card">
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{typeof x.order === 'object' ? x.order.orderNumber : x.order}</Typography>
                        <Typography variant="body2">{x.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Reason: {x.reason}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {name(x.buyer)} · {formatDateTime(x.createdAt)} · Refund {formatCurrency(x.refundAmount)}
                        </Typography>
                      </Box>
                      <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
                        <StatusChip status={x.status} />
                        <Stack direction="row" spacing={1}>
                          {x.status === 'requested' && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                  setNotes('');
                                  setTarget({ r: x, decision: 'approved' });
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                  setNotes('');
                                  setTarget({ r: x, decision: 'rejected' });
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {x.status === 'approved' && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setNotes('');
                                setTarget({ r: x, decision: 'refunded' });
                              }}
                            >
                              Issue refund
                            </Button>
                          )}
                        </Stack>
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
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="xs" aria-labelledby="ret-title">
        <DialogTitle id="ret-title" sx={{ textTransform: 'capitalize' }}>
          {target?.decision === 'refunded' ? 'Issue refund' : `${target?.decision?.replace('ed', '')} return`}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="Admin notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              if (
                target &&
                (await run(
                  () => adminApi.resolveReturn(target.r._id, { status: target.decision, adminNotes: notes || undefined }),
                  'Return updated',
                ))
              ) {
                setTarget(null);
                state.reload();
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
