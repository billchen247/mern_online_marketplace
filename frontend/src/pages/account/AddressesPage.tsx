import { Box, Button, Card, CardContent, Chip, Stack } from '@mui/material';
import { useState } from 'react';
import { userApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Address } from '../../types';
import { AddressBlock } from './AddressBlock';
import { AddressDialog } from './AddressDialog';

export function AddressesPage() {
  const state = useAsync(() => userApi.addresses(), []);
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Address | null>(null);
  return (
    <>
      <PageHeader
        title="Addresses"
        actions={
          <Button
            variant="contained"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            Add address
          </Button>
        }
      />
      <AsyncView state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState title="No saved addresses" description="Add an address to speed up checkout." />
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              {rows.map((a) => (
                <Card key={a._id} variant="outlined" data-testid="address-card">
                  <CardContent>
                    {a.isDefault && <Chip size="small" color="primary" label="Default" sx={{ mb: 1 }} />}
                    <AddressBlock a={a} />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setEdit(a);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {!a.isDefault && (
                        <Button
                          size="small"
                          onClick={async () => {
                            if (await run(() => userApi.updateAddress(a._id, { isDefault: true }), 'Default address updated'))
                              state.reload();
                          }}
                        >
                          Make default
                        </Button>
                      )}
                      <Button size="small" color="error" onClick={() => setDel(a)}>
                        Delete
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )
        }
      </AsyncView>
      <AddressDialog open={open} initial={edit} onClose={() => setOpen(false)} onSaved={state.reload} />
      <ConfirmDialog
        open={Boolean(del)}
        title="Delete address?"
        message="This address will be removed. Past orders keep their own copy."
        destructive
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (del && (await run(() => userApi.deleteAddress(del._id), 'Address deleted')) !== undefined) {
            setDel(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
