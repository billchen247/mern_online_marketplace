import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { newRefreshToken, sha256, signAccessToken } from '../utils/tokens.js';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
const MAX_REFRESH_TOKENS = 5;

export const hashPassword = (pw: string) => bcrypt.hash(pw, env.bcryptRounds);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function publicUser(u: any) {
  return {
    id: String(u._id ?? u.id),
    name: u.name,
    email: u.email,
    roles: u.roles,
    status: u.status,
    phone: u.phone,
    createdAt: u.createdAt,
  };
}

async function issueSession(user: any) {
  const refresh = newRefreshToken(String(user._id));
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          $each: [{ hash: refresh.hash, expiresAt: refresh.expiresAt }],
          $slice: -MAX_REFRESH_TOKENS,
        },
      },
    },
  );
  return { accessToken: signAccessToken(String(user._id)), refreshToken: refresh.token, user: publicUser(user) };
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await User.exists({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  // Roles are NEVER taken from client input: every new account is a plain buyer.
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    roles: ['user'],
  });
  return issueSession(user);
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const invalid = ApiError.unauthorized('Invalid email or password');
  if (!user) {
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali'); // timing equalisation
    throw invalid;
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(429, 'Account temporarily locked due to repeated failed logins. Try again later.', undefined, 'ACCOUNT_LOCKED');
  }
  const okPw = await verifyPassword(password, user.passwordHash);
  if (!okPw) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: lock ? 0 : attempts, ...(lock && { lockUntil: new Date(Date.now() + LOCK_MS) }) } },
    );
    throw invalid;
  }
  if (user.status !== 'active') throw ApiError.forbidden('Account is not active');
  await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
  return issueSession(user);
}

/** Rotates the refresh token. Presenting an unknown/used token revokes every session (reuse detection). */
export async function refresh(token: string | undefined) {
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  const userId = token.split('.')[0];
  if (!userId || !/^[a-f0-9]{24}$/.test(userId)) throw ApiError.unauthorized('Invalid refresh token');
  const hash = sha256(token);
  const user = await User.findById(userId).select('+refreshTokens name email roles status phone createdAt');
  if (!user) throw ApiError.unauthorized('Invalid refresh token');
  const entry = user.refreshTokens.find((t) => t.hash === hash);
  if (!entry || !entry.expiresAt || entry.expiresAt < new Date()) {
    if (!entry) await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  if (user.status !== 'active') throw ApiError.forbidden('Account is not active');
  await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { hash } } });
  return issueSession(user);
}

export async function logout(token: string | undefined) {
  if (!token) return;
  const userId = token.split('.')[0];
  if (!userId || !/^[a-f0-9]{24}$/.test(userId)) return;
  await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { hash: sha256(token) } } });
}
