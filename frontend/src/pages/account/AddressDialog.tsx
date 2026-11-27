import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack } from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { userApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { useAction } from '../../hooks/useAction';
import type { Address } from '../../types';
import { addressSchema } from '../../validation/schemas';

type AddressForm = Omit<Address, '_id'>;

export function AddressDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Address | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { run, busy } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'US', isDefault: false },
  });
  useEffect(() => {
    if (open)
      reset(
        initial
          ? { ...initial }
          : {
              recipientName: '',
              phone: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              state: '',
              postalCode: '',
              country: 'US',
              isDefault: false,
            },
      );
  }, [open, initial, reset]);
  const save = handleSubmit(async (v) => {
    const r = await run(
      () => (initial ? userApi.updateAddress(initial._id, v) : userApi.addAddress(v)),
      initial ? 'Address updated' : 'Address added',
    );
    if (r) {
      onSaved();
      onClose();
    }
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="addr-title">
      <form onSubmit={save} noValidate>
        <DialogTitle id="addr-title">{initial ? 'Edit address' : 'Add address'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormText label="Recipient name" fieldError={errors.recipientName} {...register('recipientName')} />
            <FormText label="Phone" fieldError={errors.phone} {...register('phone')} />
            <FormText label="Address line 1" fieldError={errors.addressLine1} {...register('addressLine1')} />
            <FormText label="Address line 2 (optional)" fieldError={errors.addressLine2} {...register('addressLine2')} />
            <Stack direction="row" spacing={2}>
              <FormText label="City" fieldError={errors.city} {...register('city')} />
              <FormText label="State" fieldError={errors.state} {...register('state')} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormText label="Postal code" fieldError={errors.postalCode} {...register('postalCode')} />
              <FormText label="Country" fieldError={errors.country} {...register('country')} />
            </Stack>
            <FormControlLabel
              control={<Checkbox {...register('isDefault')} defaultChecked={Boolean(initial?.isDefault)} />}
              label="Set as default address"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Save address
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
