import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { sellerApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { useAction } from '../../hooks/useAction';
import type { SellerOrder } from '../../types';
import { trackingSchema } from '../../validation/schemas';

export function TrackingDialog({
  order,
  open,
  markShipped,
  onClose,
  onDone,
}: {
  order: SellerOrder;
  open: boolean;
  markShipped: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { run, busy } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ carrier: string; trackingNumber: string; trackingUrl?: string }>({
    resolver: zodResolver(trackingSchema),
    values: {
      carrier: order.trackingInformation?.carrier ?? '',
      trackingNumber: order.trackingInformation?.trackingNumber ?? '',
      trackingUrl: order.trackingInformation?.trackingUrl ?? '',
    },
  });
  const submit = handleSubmit(async (v) => {
    const body = { ...v, trackingUrl: v.trackingUrl || undefined };
    const r = await run(
      () =>
        markShipped ? sellerApi.updateOrderStatus(order._id, { status: 'shipped', ...body }) : sellerApi.updateTracking(order._id, body),
      markShipped ? 'Order marked as shipped' : 'Tracking updated',
    );
    if (r) {
      onDone();
      onClose();
    }
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="trk-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="trk-title">{markShipped ? 'Mark as shipped' : 'Update tracking'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormText label="Carrier" fieldError={errors.carrier} {...register('carrier')} />
            <FormText label="Tracking number" fieldError={errors.trackingNumber} {...register('trackingNumber')} />
            <FormText label="Tracking URL (optional)" fieldError={errors.trackingUrl} {...register('trackingUrl')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {markShipped ? 'Ship order' : 'Save tracking'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
