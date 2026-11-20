import { Button, Container, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '../components/StateViews';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';
import { decideAccess } from '../utils/roles';

export function Forbidden() {
  return (
    <Container sx={{ maxWidth: 'sm', py: 10 }}>
      <Stack spacing={2} role="alert" sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="h4" component="h1">Access denied</Typography>
        <Typography color="text.secondary">Your account does not have permission to view this page.</Typography>
        <Button component={RouterLink} to="/" variant="contained">Back to home</Button>
      </Stack>
    </Container>
  );
}

/** Route guard (UX only — every API call is independently authorized on the server). */
export function RequireRole({ roles, children }: { roles?: Role[]; children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const decision = decideAccess({ loading, user }, roles);
  if (decision === 'loading') return <Loading />;
  if (decision === 'login') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (decision === 'forbidden') return <Forbidden />;
  return <>{children ?? <Outlet />}</>;
}
