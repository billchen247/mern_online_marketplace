import type { Role, User } from '../types';

export const hasRole = (user: Pick<User, 'roles'> | null | undefined, role: Role) => Boolean(user?.roles?.includes(role));
export const hasAnyRole = (user: Pick<User, 'roles'> | null | undefined, roles: Role[]) => roles.some((r) => hasRole(user, r));
export const isSeller = (u?: Pick<User, 'roles'> | null) => hasRole(u, 'seller');
export const isAdmin = (u?: Pick<User, 'roles'> | null) => hasRole(u, 'admin');

/** Pure route-access decision used by guards (UX only — the API enforces authorization). */
export type AccessDecision = 'allow' | 'login' | 'forbidden' | 'loading';
export function decideAccess(state: { loading: boolean; user: Pick<User, 'roles'> | null }, required?: Role[]): AccessDecision {
  if (state.loading) return 'loading';
  if (!state.user) return 'login';
  if (required && required.length > 0 && !hasAnyRole(state.user, required)) return 'forbidden';
  return 'allow';
}
