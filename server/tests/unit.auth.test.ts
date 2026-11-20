import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword, publicUser } from '../src/services/auth.service.js';
import { newRefreshToken, sha256, signAccessToken, verifyAccessToken } from '../src/utils/tokens.js';
import { env } from '../src/config/env.js';
import { detectImageType } from '../src/middleware/upload.js';
import { escapeRegex, slugify, compact, sameId } from '../src/utils/helpers.js';
import { registerSchema, productListQuery, stockSchema } from '../src/validators/index.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('passwords', () => {
  it('hashes with bcrypt and verifies', async () => {
    const h = await hashPassword('Secret123');
    expect(h).not.toContain('Secret123');
    expect(h.startsWith('$2')).toBe(true);
    expect(await verifyPassword('Secret123', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
  it('publicUser never leaks the hash', () => {
    const u = publicUser({ _id: 'x', name: 'A', email: 'a@b.c', roles: ['user'], passwordHash: 'h', status: 'active' });
    expect(JSON.stringify(u)).not.toContain('passwordHash');
  });
});

describe('jwt', () => {
  it('round-trips an access token', () => expect(verifyAccessToken(signAccessToken('abc')).sub).toBe('abc'));
  it('rejects tampered, expired and wrongly-signed tokens', () => {
    expect(() => verifyAccessToken('garbage')).toThrow(ApiError);
    const expired = jwt.sign({ sub: 'x' }, env.jwtSecret, { expiresIn: -10, issuer: 'marketplace-api' });
    expect(() => verifyAccessToken(expired)).toThrow(/expired/);
    const forged = jwt.sign({ sub: 'x' }, 'other-secret-other-secret', { issuer: 'marketplace-api' });
    expect(() => verifyAccessToken(forged)).toThrow(/Invalid/);
    const noSub = jwt.sign({ foo: 1 }, env.jwtSecret, { issuer: 'marketplace-api' });
    expect(() => verifyAccessToken(noSub)).toThrow();
  });
  it('refresh tokens are hashed for storage', () => {
    const t = newRefreshToken('507f1f77bcf86cd799439011');
    expect(t.hash).toBe(sha256(t.token));
    expect(t.token.startsWith('507f1f77bcf86cd799439011.')).toBe(true);
    expect(t.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('helpers & validators', () => {
  it('detects image magic bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe('png');
    expect(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('webp');
    expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
  });
  it('string helpers', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(slugify('  Hello, World!! ')).toBe('hello-world');
    expect(slugify('!!!')).toBe('item');
    expect(compact({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(sameId('1', 1)).toBe(true);
  });
  it('validates registration and queries', () => {
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'Password1' }).success).toBe(true);
    const q = productListQuery.parse({ page: '2', minPrice: '5', inStock: 'true' });
    expect(q).toMatchObject({ page: 2, limit: 12, minPrice: 5, inStock: true, sortBy: 'newest', order: 'desc' });
    expect(productListQuery.safeParse({ sortBy: 'bogus' }).success).toBe(false);
    expect(stockSchema.safeParse({ adjustment: 5, set: 3 }).success).toBe(false);
    expect(stockSchema.safeParse({ adjustment: 0 }).success).toBe(false);
    expect(stockSchema.safeParse({ set: 4 }).success).toBe(true);
  });
});
