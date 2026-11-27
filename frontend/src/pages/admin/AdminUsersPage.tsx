import { Button, Chip, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
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
export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.users({ page, search: dq || undefined, role: role || undefined }), [page, dq, role]);
  const { run, busy } = useAction();
  const [confirm, setConfirm] = useState<{ id: string; label: string; body: Parameters<typeof adminApi.updateUser>[1] } | null>(null);
  return (
    <>
      <PageHeader title="Users" subtitle="Roles are additive. Admin and seller access is enforced by the server." />
      <Filters>
        <TextField
          size="small"
          label="Search name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          size="small"
          label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {['user', 'seller', 'admin'].map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No users found" />
          ) : (
            <>
              <Paper variant="outlined" sx={tableSx}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((u) => {
                      const uid = u._id ?? u.id;
                      return (
                        <TableRow key={uid} data-testid="user-row">
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {u.roles.map((x) => (
                              <Chip key={x} size="small" label={x} sx={{ mr: 0.5 }} />
                            ))}
                          </TableCell>
                          <TableCell>
                            <StatusChip status={u.status} />
                          </TableCell>
                          <TableCell align="right">
                            {u.roles.includes('admin') ? (
                              <Button
                                size="small"
                                onClick={() =>
                                  setConfirm({ id: uid, label: `Remove admin role from ${u.name}`, body: { removeRoles: ['admin'] } })
                                }
                              >
                                Remove admin
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                onClick={() =>
                                  setConfirm({ id: uid, label: `Grant admin role to ${u.name}`, body: { addRoles: ['admin'] } })
                                }
                              >
                                Make admin
                              </Button>
                            )}
                            {u.status === 'suspended' ? (
                              <Button
                                size="small"
                                onClick={() => setConfirm({ id: uid, label: `Reactivate ${u.name}`, body: { status: 'active' } })}
                              >
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => setConfirm({ id: uid, label: `Suspend ${u.name}`, body: { status: 'suspended' } })}
                              >
                                Suspend
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
              <Pager pagination={r.pagination} onChange={setPage} />
            </>
          )
        }
      </AsyncView>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Confirm action"
        message={confirm?.label ?? ''}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm && (await run(() => adminApi.updateUser(confirm.id, confirm.body), 'User updated'))) {
            setConfirm(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
