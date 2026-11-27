import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { FormText } from '../../components/FormFields';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotifyContext';
import { getErrorMessage } from '../../utils/errors';
import { registerSchema } from '../../validation/schemas';
import { useRedirect } from './useRedirect';

export default function RegisterPage() {
  const { register: signUp, user } = useAuth();
  const { success } = useNotify();
  const navigate = useNavigate();
  const from = useRedirect();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; email: string; password: string; confirmPassword: string }>({ resolver: zodResolver(registerSchema) });
  if (user) return <Navigate to={from} replace />;
  return (
    <Container sx={{ maxWidth: 'xs', py: 8 }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Create your account
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              await signUp(v.name, v.email, v.password);
              success('Account created. Welcome!');
              navigate(from, { replace: true });
            } catch (e) {
              setError(getErrorMessage(e));
            }
          })}
        >
          <Stack spacing={2}>
            <FormText label="Full name" autoComplete="name" fieldError={errors.name} {...register('name')} />
            <FormText label="Email" type="email" autoComplete="email" fieldError={errors.email} {...register('email')} />
            <FormText
              label="Password"
              type="password"
              autoComplete="new-password"
              helperText="8+ characters with a letter and a number"
              fieldError={errors.password}
              {...register('password')}
            />
            <FormText
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              fieldError={errors.confirmPassword}
              {...register('confirmPassword')}
            />
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create account'}
            </Button>
          </Stack>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" state={{ from }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}