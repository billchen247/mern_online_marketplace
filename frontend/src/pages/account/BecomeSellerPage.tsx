import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { userApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { AsyncView } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { sellerApplicationSchema } from '../../validation/schemas';

export function BecomeSellerPage() {
  const { user, refreshUser } = useAuth();
  const app = useAsync(() => userApi.myApplication(), []);
  const { run, busy } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ businessName: string; businessDescription: string; email: string; phone: string; address?: string }>({
    resolver: zodResolver(sellerApplicationSchema),
    defaultValues: { email: user?.email },
  });
  const isSeller = user?.roles.includes('seller');
  const a = app.data;
  return (
    <>
      <PageHeader
        title="Become a seller"
        subtitle="Apply to open shops and sell on the marketplace. An administrator reviews every application."
      />
      <AsyncView state={app} allowNull>
        {() => (
          <Stack spacing={3} sx={{ maxWidth: 560 }}>
            {a && (
              <Alert
                severity={a.applicationStatus === 'approved' ? 'success' : a.applicationStatus === 'rejected' ? 'error' : 'info'}
                data-testid="application-status"
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <span>
                    Your application for <b>{a.businessName}</b> is
                  </span>
                  <StatusChip status={a.applicationStatus} />
                </Stack>
                {a.reviewNotes && <Typography variant="body2">Reviewer notes: {a.reviewNotes}</Typography>}
              </Alert>
            )}
            {isSeller && (
              <Button component={RouterLink} to="/seller" variant="contained">
                Go to seller portal
              </Button>
            )}
            {!isSeller && a?.applicationStatus === 'approved' && <Button onClick={() => refreshUser()}>Refresh my roles</Button>}
            {!isSeller && (!a || a.applicationStatus === 'rejected') && (
              <Box
                component="form"
                noValidate
                onSubmit={handleSubmit(async (v) => {
                  if (
                    await run(
                      () =>
                        userApi.applyToSell({
                          businessName: v.businessName,
                          businessDescription: v.businessDescription,
                          contactInformation: { email: v.email, phone: v.phone, address: v.address || undefined },
                        }),
                      'Application submitted',
                    )
                  )
                    app.reload();
                })}
              >
                <Stack spacing={2}>
                  <FormText label="Business name" fieldError={errors.businessName} {...register('businessName')} />
                  <FormText
                    label="Business description"
                    multiline
                    minRows={3}
                    fieldError={errors.businessDescription}
                    {...register('businessDescription')}
                  />
                  <FormText label="Contact email" fieldError={errors.email} {...register('email')} />
                  <FormText label="Contact phone" fieldError={errors.phone} {...register('phone')} />
                  <FormText label="Business address (optional)" fieldError={errors.address} {...register('address')} />
                  <Button type="submit" variant="contained" disabled={busy}>
                    Submit application
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </AsyncView>
    </>
  );
}
