import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { tableSx } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';

import { Filters } from './Filters';
export function AdminSellersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.sellers({ page, search: dq || undefined }), [page, dq]);
  const { run, busy } = useAction();
  const [target, setTarget] = useState<{ id: string; action: 'suspend' | 'reactivate'; name: string } | null>(null);
  return (
    <>
      <PageHeader title="Sellers" subtitle="Suspending a seller hides their shops and products from buyers." />
      <Filters>
        <TextField
          size="small"
          label="Search sellers"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No sellers" />
          ) : (
            <>
              <Paper variant="outlined" sx={tableSx}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="right">Shops</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell align="right">{s.shops}</TableCell>
                        <TableCell>
                          <StatusChip status={s.status} />
                        </TableCell>
                        <TableCell align="right">
                          {s.status === 'suspended' ? (
                            <Button size="small" onClick={() => setTarget({ id: s.id, action: 'reactivate', name: s.name })}>
                              Reactivate
                            </Button>
                          ) : (
                            <Button size="small" color="error" onClick={() => setTarget({ id: s.id, action: 'suspend', name: s.name })}>
                              Suspend
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
      <ConfirmDialog
        open={Boolean(target)}
        title={`${target?.action === 'suspend' ? 'Suspend' : 'Reactivate'} seller?`}
        message={target?.name ?? ''}
        destructive={target?.action === 'suspend'}
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          if (target && (await run(() => adminApi.updateSeller(target.id, { action: target.action }), 'Seller updated'))) {
            setTarget(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
