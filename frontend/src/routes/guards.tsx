import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '../components/StateViews';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';
import { decideAccess } from '../utils/roles';
import { Forbidden } from './Forbidden';

export { Forbidden } from './Forbidden';

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
