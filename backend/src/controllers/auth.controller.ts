import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import * as auth from '../services/auth.service.js';
import * as users from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';

const COOKIE = 'refresh_token';
const cookieOpts = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/api/v1/auth',
  maxAge: env.refreshTokenTtlDays * 86400_000,
});

function sendSession(res: Response, s: Awaited<ReturnType<typeof auth.login>>, message: string, status = 200) {
  res.cookie(COOKIE, s.refreshToken, cookieOpts());
  return status === 201
    ? created(res, message, { user: s.user, accessToken: s.accessToken })
    : ok(res, message, { user: s.user, accessToken: s.accessToken });
}

export const register = asyncHandler(async (req, res) => sendSession(res, await auth.register(req.body), 'Registration successful', 201));
export const login = asyncHandler(async (req, res) =>
  sendSession(res, await auth.login(req.body.email, req.body.password), 'Login successful'),
);
export const refresh = asyncHandler(async (req, res) => sendSession(res, await auth.refresh(req.cookies?.[COOKIE]), 'Token refreshed'));
export const logout = asyncHandler(async (req, res) => {
  await auth.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOpts(), maxAge: undefined });
  return ok(res, 'Logged out');
});
export const me = asyncHandler(async (req, res) => ok(res, 'Current user', await users.getProfile(req.user!.id)));
