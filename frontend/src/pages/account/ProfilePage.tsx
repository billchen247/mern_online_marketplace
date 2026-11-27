import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { userApi } from '../../api/services';
import { FormText } from '../../components/FormFields';
import { PageHeader } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from '../../hooks/useAction';
import { profileSchema } from '../../validation/schemas';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { run, busy } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; phone?: string }>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name, phone: user?.phone ?? '' },
  });
  const pw = useForm<{ currentPassword: string; newPassword: string }>();
  useEffect(() => reset({ name: user?.name, phone: user?.phone ?? '' }), [user, reset]);
  return (
    <>
      <PageHeader title="Profile" subtitle={user?.email} />
      <Stack spacing={4} sx={{ maxWidth: 480 }}>
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            if (await run(() => userApi.update(v), 'Profile updated')) await refreshUser();
          })}
        >
          <Stack spacing={2}>
            <FormText label="Name" fieldError={errors.name} {...register('name')} />
            <FormText label="Phone" fieldError={errors.phone} {...register('phone')} />
            <Button type="submit" variant="contained" disabled={busy}>
              Save profile
            </Button>
          </Stack>
        </Box>
        <Box
          component="form"
          onSubmit={pw.handleSubmit(async (v) => {
            if (await run(() => userApi.update(v), 'Password changed')) pw.reset();
          })}
        >
          <Stack spacing={2}>
            <Typography variant="h6">Change password</Typography>
            <TextField
              size="small"
              type="password"
              label="Current password"
              autoComplete="current-password"
              {...pw.register('currentPassword', { required: true })}
            />
            <TextField
              size="small"
              type="password"
              label="New password"
              autoComplete="new-password"
              helperText="8+ characters with a letter and a number"
              {...pw.register('newPassword', { required: true, minLength: 8 })}
            />
            <Button type="submit" variant="outlined" disabled={busy}>
              Change password
            </Button>
          </Stack>
        </Box>
      </Stack>
    </>
  );
}
