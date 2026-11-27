import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { orderApi } from '../../api/services';
import { useAction } from '../../hooks/useAction';
import type { Order, SellerOrder } from '../../types';
import { returnFormSchema } from '../../validation/schemas';

export function ReturnDialog({ order, so, onClose, onDone }: { order: Order; so: SellerOrder | null; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [sel, setSel] = useState<Record<string, number>>({});
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ reason: string }>({ resolver: zodResolver(returnFormSchema) });
  if (!so) return null;
  const submit = handleSubmit(async ({ reason }) => {
    const items = Object.entries(sel)
      .filter(([, q]) => q > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    if (items.length === 0) return;
    if (await run(() => orderApi.requestReturn(order._id, { sellerOrderId: so._id, items, reason }), 'Return requested')) {
      onDone();
      onClose();
    }
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="ret-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="ret-title">Request a return · {so.orderNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {so.items.map((i) => {
              const max = i.quantity - (i.returnedQuantity ?? 0);
              return (
                <Stack key={i._id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <FormControlLabel
                    disabled={max <= 0}
                    control={
                      <Checkbox checked={(sel[i._id] ?? 0) > 0} onChange={(e) => setSel({ ...sel, [i._id]: e.target.checked ? max : 0 })} />
                    }
                    label={`${i.name} (max ${max})`}
                  />
                  {(sel[i._id] ?? 0) > 0 && (
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      value={sel[i._id]}
                      slotProps={{ htmlInput: { min: 1, max, 'aria-label': `Return quantity for ${i.name}` } }}
                      onChange={(e) => setSel({ ...sel, [i._id]: Math.min(max, Math.max(1, Number(e.target.value))) })}
                    />
                  )}
                </Stack>
              );
            })}
            <TextField
              label="Reason for return"
              multiline
              minRows={3}
              {...register('reason')}
              error={Boolean(errors.reason)}
              helperText={errors.reason?.message}
            />
            {Object.values(sel).every((q) => !q) && (
              <Typography variant="caption" color="text.secondary">
                Select at least one item.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Submit request
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
