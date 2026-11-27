import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { name, tableSx } from './AdminShared';
import { useState } from 'react';
import { adminApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, Pager, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Shop } from '../../types';

import { Filters } from './Filters';
import { StatusFilter } from './StatusFilter';
export function AdminShopsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(search);
  const state = useAsync(() => adminApi.shops({ page, search: dq || undefined, status: status || undefined }), [page, dq, status]);
  const { run } = useAction();
  const set = async (s: Shop, st: string) => {
    if (await run(() => adminApi.updateShop(s._id, st), 'Shop updated')) state.reload();
  };
  return (
    <>
      <PageHeader title="Shops" />
      <Filters>
        <TextField
          size="small"
          label="Search shops"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['pending', 'active', 'inactive', 'suspended']}
        />
      </Filters>
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No shops" />
          ) : (
            <>
              <Paper variant="outlined" sx={tableSx}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Shop</TableCell>
                      <TableCell>Seller</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.data.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{name(s.seller)}</TableCell>
                        <TableCell>
                          <StatusChip status={s.status} />
                        </TableCell>
                        <TableCell align="right">
                          {s.status !== 'active' && (
                            <Button size="small" onClick={() => set(s, 'active')}>
                              Approve / activate
                            </Button>
                          )}
                          {s.status !== 'suspended' && (
                            <Button size="small" color="error" onClick={() => set(s, 'suspended')}>
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
    </>
  );
}
