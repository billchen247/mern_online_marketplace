import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

export interface AccessPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AccessPayload, env.jwtSecret, {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
    issuer: 'marketplace-api',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'marketplace-api' });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') throw new Error('bad payload');
    return { sub: decoded.sub };
  } catch (err) {
    const expired = (err as Error).name === 'TokenExpiredError';
    throw ApiError.unauthorized(expired ? 'Access token expired' : 'Invalid authentication token');
  }
}

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function newRefreshToken(userId: string): { token: string; hash: string; expiresAt: Date } {
  const token = `${userId}.${crypto.randomBytes(40).toString('hex')}`;
  return {
    token,
    hash: sha256(token),
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 86400_000),
  };
}
