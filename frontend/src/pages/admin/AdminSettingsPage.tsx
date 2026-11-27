import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, FormControlLabel, Stack, Switch } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { adminApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { AsyncView } from '../../components/StateViews';
import { PageHeader } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { settingsFormSchema } from '../../validation/schemas';

type SForm = {
  marketplaceName: string;
  tagline: string;
  primaryColor: string;
  commissionRate: number;
  flatRate: number;
  freeShippingThreshold: number;
  taxRate: number;
  requireProductApproval: boolean;
  requireShopApproval: boolean;
};
export function AdminSettingsPage() {
  const state = useAsync(() => adminApi.settings(), []);
  const { run, busy } = useAction();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SForm>({ resolver: zodResolver(settingsFormSchema) as never });
  useEffect(() => {
    const s = state.data;
    if (s)
      reset({
        marketplaceName: s.marketplaceName,
        tagline: s.tagline,
        primaryColor: s.primaryColor,
        commissionRate: s.commissionRate,
        flatRate: s.shipping.flatRate,
        freeShippingThreshold: s.shipping.freeShippingThreshold,
        taxRate: s.tax.rate,
        requireProductApproval: s.moderation.requireProductApproval,
        requireShopApproval: s.moderation.requireShopApproval,
      });
  }, [state.data, reset]);
  const submit = handleSubmit(async (v) => {
    await run(
      () =>
        adminApi.updateSettings({
          marketplaceName: v.marketplaceName,
          tagline: v.tagline,
          primaryColor: v.primaryColor,
          commissionRate: v.commissionRate,
          shipping: { flatRate: v.flatRate, freeShippingThreshold: v.freeShippingThreshold },
          tax: { rate: v.taxRate },
          moderation: { requireProductApproval: v.requireProductApproval, requireShopApproval: v.requireShopApproval },
        }),
      'Settings saved',
    );
  });
  return (
    <>
      <PageHeader title="Marketplace settings" subtitle="Commission changes apply to future orders only." />
      <AsyncView state={state}>
        {() => (
          <Box component="form" noValidate onSubmit={submit} sx={{ maxWidth: 640 }}>
            <Stack spacing={2}>
              <FormText label="Marketplace name" fieldError={errors.marketplaceName} {...register('marketplaceName')} />
              <FormText label="Tagline" fieldError={errors.tagline} {...register('tagline')} />
              <FormText label="Primary color (hex)" fieldError={errors.primaryColor} {...register('primaryColor')} />
              <FormText
                label="Commission rate (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.1' } }}
                fieldError={errors.commissionRate}
                {...register('commissionRate', { valueAsNumber: true })}
              />
              <FormText
                label="Flat shipping rate"
                type="number"
                slotProps={{ htmlInput: { step: '0.01' } }}
                fieldError={errors.flatRate}
                {...register('flatRate', { valueAsNumber: true })}
              />
              <FormText
                label="Free shipping threshold"
                type="number"
                slotProps={{ htmlInput: { step: '0.01' } }}
                fieldError={errors.freeShippingThreshold}
                {...register('freeShippingThreshold', { valueAsNumber: true })}
              />
              <FormText
                label="Tax rate (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.1' } }}
                fieldError={errors.taxRate}
                {...register('taxRate', { valueAsNumber: true })}
              />
              <Controller
                name="requireProductApproval"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={Boolean(field.value)} onChange={(_, c) => field.onChange(c)} />}
                    label="Require approval for new products"
                  />
                )}
              />
              <Controller
                name="requireShopApproval"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={Boolean(field.value)} onChange={(_, c) => field.onChange(c)} />}
                    label="Require approval for new shops"
                  />
                )}
              />
              <Box>
                <Button type="submit" variant="contained" disabled={busy}>
                  Save settings
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </AsyncView>
    </>
  );
}
