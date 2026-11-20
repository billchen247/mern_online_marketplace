import type { NextFunction, Request, Response } from 'express';
import { User, type Role } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

async function loadUser(req: Request, token: string) {
  const { sub } = verifyAccessToken(token);
  // Roles/status are always re-read from the database; token contents are never trusted for authorization.
  const user = await User.findById(sub).select('name email roles status');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status !== 'active') throw ApiError.forbidden('Account is not active');
  req.user = { id: user.id, name: user.name, email: user.email, roles: user.roles as Role[] };
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();
  await loadUser(req, token);
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (token) await loadUser(req, token);
  next();
});

/** Requires the authenticated user to hold at least one of the given roles. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.some((r) => req.user!.roles.includes(r))) return next(ApiError.forbidden());
    next();
  };

export const requireSeller = requireRole('seller');
export const requireAdmin = requireRole('admin');

export function hasRole(user: { roles: Role[] } | undefined, role: Role): boolean {
  return Boolean(user?.roles.includes(role));
}
