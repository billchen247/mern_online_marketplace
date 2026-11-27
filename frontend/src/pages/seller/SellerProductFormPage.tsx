import { zodResolver } from '@hookform/resolvers/zod';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/DeleteOutlined';
import { Alert, Box, Button, IconButton, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { catalogApi, sellerApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { ImageUploader } from '../../components/ImageUploader';
import { AsyncView } from '../../components/StateViews';
import { PageHeader } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { ImageRef, Product } from '../../types';
import { productFormSchema } from '../../validation/schemas';

const shopId = (p: Product) => (typeof p.shop === 'string' ? p.shop : p.shop._id);

const catId = (p: Product) => (typeof p.category === 'string' ? p.category : p.category._id);

type PForm = {
  shop: string;
  category: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  sku: string;
  status: 'draft' | 'active' | 'inactive';
  specifications: { key: string; value: string }[];
};

export function SellerProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const shops = useAsync(() => sellerApi.shops(), []);
  const cats = useAsync(() => catalogApi.categories(), []);
  const existing = useAsync(() => (editing ? sellerApi.product(id!) : Promise.resolve(null)), [id]);
  const [images, setImages] = useState<ImageRef[]>([]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PForm>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: {
      shop: '',
      category: '',
      name: '',
      description: '',
      price: 0,
      discount: 0,
      stock: 0,
      sku: '',
      status: 'active',
      specifications: [],
    },
  });
  const spec = useFieldArray({ control, name: 'specifications' });
  useEffect(() => {
    const p = existing.data;
    if (p) {
      reset({
        shop: shopId(p),
        category: catId(p),
        name: p.name,
        description: p.description,
        price: p.price,
        discount: p.discount,
        stock: p.stock,
        sku: p.sku,
        status: p.status === 'draft' || p.status === 'inactive' ? p.status : 'active',
        specifications: p.specifications,
      });
      setImages(p.images);
    }
  }, [existing.data, reset]);
  const submit = handleSubmit(async (v) => {
    const r = await run(
      () => (editing ? sellerApi.updateProduct(id!, { ...v, images }) : sellerApi.createProduct({ ...v, images })),
      editing ? 'Product updated' : 'Product created',
    );
    if (r) navigate('/seller/products');
  });
  const noShops = shops.data && shops.data.length === 0;
  return (
    <>
      <PageHeader title={editing ? 'Edit product' : 'Add product'} />
      {noShops && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You need a shop before adding products.{' '}
          <Link component={RouterLink} to="/seller/shops/new">
            Create a shop
          </Link>
        </Alert>
      )}
      <AsyncView state={existing} allowNull>
        {(p) => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 760 }}>
            <Stack spacing={2}>
              {p && Boolean(p.status === 'blocked') && (
                <Alert severity="error">This product was blocked by a moderator and cannot be sold.</Alert>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="shop"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Shop"
                      {...field}
                      disabled={editing}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    >
                      {(shops.data ?? [])
                        .filter((s) => s.status !== 'suspended')
                        .map((s) => (
                          <MenuItem key={s._id} value={s._id}>
                            {s.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="category"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Category"
                      {...field}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    >
                      {(cats.data ?? []).map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>
              <FormText label="Product name" fieldError={errors.name} {...register('name')} />
              <FormText label="Description" multiline minRows={4} fieldError={errors.description} {...register('description')} />
              <ImageUploader label="Product images" value={images} onChange={setImages} max={8} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormText
                  label="Price (USD)"
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                  fieldError={errors.price}
                  {...register('price', { valueAsNumber: true })}
                />
                <FormText
                  label="Discount (%)"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, max: 90 } }}
                  fieldError={errors.discount}
                  {...register('discount', { valueAsNumber: true })}
                />
                <FormText
                  label="Stock"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                  fieldError={errors.stock}
                  {...register('stock', { valueAsNumber: true })}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormText label="SKU" fieldError={errors.sku} {...register('sku')} />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField select fullWidth size="small" label="Status" {...field}>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                  )}
                />
              </Stack>
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 600 }}>Specifications</Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => spec.append({ key: '', value: '' })}>
                    Add
                  </Button>
                </Stack>
                {spec.fields.map((f, i) => (
                  <Stack key={f.id} direction="row" spacing={1} sx={{ mt: 1 }}>
                    <FormText label="Name" fieldError={errors.specifications?.[i]?.key} {...register(`specifications.${i}.key`)} />
                    <FormText label="Value" fieldError={errors.specifications?.[i]?.value} {...register(`specifications.${i}.value`)} />
                    <IconButton aria-label={`Remove specification ${i + 1}`} onClick={() => spec.remove(i)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                ))}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={busy || Boolean(noShops)}>
                  {editing ? 'Save changes' : 'Create product'}
                </Button>
                <Button component={RouterLink} to="/seller/products">
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
