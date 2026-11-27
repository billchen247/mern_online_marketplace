import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { sellerApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { ImageUploader } from '../../components/ImageUploader';
import { AsyncView } from '../../components/StateViews';
import { PageHeader } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { ImageRef } from '../../types';
import { shopSchema } from '../../validation/schemas';

type ShopForm = { name: string; description?: string; email?: string; phone?: string; address?: string };
export function SellerShopFormPage() {
  const { id } = useParams();
  const editing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [logo, setLogo] = useState<ImageRef[]>([]);
  const [banner, setBanner] = useState<ImageRef[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShopForm>({ resolver: zodResolver(shopSchema) });
  const shop = useAsync(() => (editing ? sellerApi.shop(id!) : Promise.resolve(null)), [id]);
  useEffect(() => {
    const s = shop.data;
    if (s) {
      reset({ name: s.name, description: s.description, email: s.contact?.email, phone: s.contact?.phone, address: s.contact?.address });
      setLogo(s.logo ? [s.logo] : []);
      setBanner(s.banner ? [s.banner] : []);
      setStatus(s.status === 'inactive' ? 'inactive' : 'active');
    }
  }, [shop.data, reset]);
  const submit = handleSubmit(async (v) => {
    const body = {
      name: v.name,
      description: v.description,
      logo: logo[0],
      banner: banner[0],
      contact: { email: v.email || undefined, phone: v.phone || undefined, address: v.address || undefined },
    };
    const r = await run(
      () => (editing ? sellerApi.updateShop(id!, { ...body, status }) : sellerApi.createShop(body)),
      editing ? 'Shop updated' : 'Shop created',
    );
    if (r) navigate('/seller/shops');
  });
  return (
    <>
      <PageHeader title={editing ? 'Edit shop' : 'Create shop'} />
      <AsyncView state={shop} allowNull>
        {() => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 640 }}>
            <Stack spacing={2}>
              <FormText label="Shop name" fieldError={errors.name} {...register('name')} />
              <FormText label="Description" multiline minRows={3} fieldError={errors.description} {...register('description')} />
              <ImageUploader label="Shop logo" value={logo} onChange={setLogo} />
              <ImageUploader label="Shop banner" value={banner} onChange={setBanner} />
              <FormText label="Contact email" fieldError={errors.email} {...register('email')} />
              <FormText label="Contact phone" fieldError={errors.phone} {...register('phone')} />
              <FormText label="Contact address" fieldError={errors.address} {...register('address')} />
              {editing && (
                <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              )}
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={busy}>
                  {editing ? 'Save changes' : 'Create shop'}
                </Button>
                <Button component={RouterLink} to="/seller/shops">
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </AsyncView>
    </>
  );
}
