import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { name } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime } from '../../utils/format';

import { Filters } from './Filters';
import { StatusFilter } from './StatusFilter';
export function AdminApplicationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const state = useAsync(() => adminApi.applications({ page, status: status || undefined }), [page, status]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ id: string; decision: 'approved' | 'rejected'; business: string } | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <>
      <PageHeader title="Seller applications" />
      <Filters>
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['pending', 'approved', 'rejected']}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No applications" />
          ) : (
            <>
              <Stack spacing={2}>
                {r.data.map((a) => (
                  <Paper key={a._id} variant="outlined" sx={{ p: 2 }} data-testid="application-card">
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{a.businessName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {name(a.user)}
                          {typeof a.user === 'object' ? ` · ${a.user.email}` : ''} · {formatDateTime(a.createdAt)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {a.businessDescription}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.contactInformation.email} · {a.contactInformation.phone}
                        </Typography>
                      </Box>
                      <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
                        <StatusChip status={a.applicationStatus} />
                        {a.applicationStatus === 'pending' && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setNotes('');
                                setTarget({ id: a._id, decision: 'approved', business: a.businessName });
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setNotes('');
                                setTarget({ id: a._id, decision: 'rejected', business: a.businessName });
                              }}
                            >
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                    {a.reviewNotes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Notes: {a.reviewNotes}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="xs" aria-labelledby="app-title">
        <DialogTitle id="app-title">
          {target?.decision === 'approved' ? 'Approve' : 'Reject'} “{target?.business}”
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="Review notes (optional)"
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
                  () => adminApi.reviewApplication(target.id, { status: target.decision, reviewNotes: notes || undefined }),
                  `Application ${target.decision}`,
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
