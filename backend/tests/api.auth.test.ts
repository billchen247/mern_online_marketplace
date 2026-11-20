import { describe, expect, it } from 'vitest';
import { User } from '../src/models/index.js';
import { api, makeAdmin, makeBuyer, makeSeller } from './helpers.js';

const reg = { name: 'New User', email: 'new@test.dev', password: 'Password123' };

describe('auth API', () => {
  it('health check responds', async () => {
    const res = await api().get('/health').expect(200);
    expect(res.body.db).toBe('connected');
  });

  it('registers with only the user role, hashes password, sets refresh cookie', async () => {
    const res = await api().post('/api/v1/auth/register').send({ ...reg, roles: ['admin', 'seller'] }).expect(201);
    expect(res.body.data.user.roles).toEqual(['user']);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=.*HttpOnly/i);
    const stored = await User.findOne({ email: reg.email }).select('+passwordHash');
    expect(stored!.passwordHash).not.toBe(reg.password);
  });

  it('rejects duplicate emails and invalid payloads', async () => {
    await api().post('/api/v1/auth/register').send(reg).expect(201);
    await api().post('/api/v1/auth/register').send(reg).expect(409);
    const bad = await api().post('/api/v1/auth/register').send({ name: 'x', email: 'nope', password: '1' }).expect(400);
    expect(bad.body.success).toBe(false);
    expect(bad.body.errors.length).toBeGreaterThan(0);
  });

  it('logs in, returns /me, rejects wrong passwords', async () => {
    await api().post('/api/v1/auth/register').send(reg).expect(201);
    const res = await api().post('/api/v1/auth/login').send({ email: reg.email, password: reg.password }).expect(200);
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.accessToken}`).expect(200);
    expect(me.body.data.email).toBe(reg.email);
    await api().post('/api/v1/auth/login').send({ email: reg.email, password: 'WrongPass1' }).expect(401);
    await api().post('/api/v1/auth/login').send({ email: 'ghost@test.dev', password: 'WrongPass1' }).expect(401);
  });

  it('locks the account after repeated failures', async () => {
    await api().post('/api/v1/auth/register').send(reg).expect(201);
    for (let i = 0; i < 5; i++) await api().post('/api/v1/auth/login').send({ email: reg.email, password: 'Bad12345' }).expect(401);
    const locked = await api().post('/api/v1/auth/login').send({ email: reg.email, password: reg.password }).expect(429);
    expect(locked.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('rejects missing/invalid/expired tokens', async () => {
    await api().get('/api/v1/auth/me').expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', 'Bearer abc.def.ghi').expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', 'Basic xyz').expect(401);
  });

  it('blocks inactive accounts', async () => {
    const b = await makeBuyer('Sleepy');
    await User.updateOne({ _id: b.id }, { status: 'inactive' });
    await api().get('/api/v1/auth/me').set('Authorization', b.auth).expect(403);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const res = await api().post('/api/v1/auth/register').send(reg).expect(201);
    const cookie = res.headers['set-cookie']![0]!.split(';')[0]!;
    const r1 = await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(200);
    const newCookie = r1.headers['set-cookie']![0]!.split(';')[0]!;
    expect(newCookie).not.toBe(cookie);
    // reuse of the old token fails and revokes the session family
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', newCookie).expect(401);
    await api().post('/api/v1/auth/refresh').expect(401);
  });

  it('logout invalidates the refresh token', async () => {
    const res = await api().post('/api/v1/auth/register').send(reg).expect(201);
    const cookie = res.headers['set-cookie']![0]!.split(';')[0]!;
    await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(200);
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });

  it('enforces role restrictions on seller and admin areas', async () => {
    const buyer = await makeBuyer();
    const seller = await makeSeller();
    const admin = await makeAdmin();
    await api().get('/api/v1/seller/dashboard').expect(401);
    await api().get('/api/v1/seller/dashboard').set('Authorization', buyer.auth).expect(403);
    await api().get('/api/v1/seller/dashboard').set('Authorization', seller.auth).expect(200);
    await api().get('/api/v1/admin/dashboard').set('Authorization', seller.auth).expect(403);
    await api().get('/api/v1/admin/dashboard').set('Authorization', admin.auth).expect(200);
  });

  it('trusts DB roles, not token contents (role revoked → immediate 403)', async () => {
    const seller = await makeSeller();
    await User.updateOne({ _id: seller.id }, { $pull: { roles: 'seller' } });
    await api().get('/api/v1/seller/shops').set('Authorization', seller.auth).expect(403);
  });

  it('updates profile and password', async () => {
    const b = await makeBuyer('Pat');
    await api().patch('/api/v1/users/me').set('Authorization', b.auth).send({ name: 'Patricia' }).expect(200);
    await api().patch('/api/v1/users/me').set('Authorization', b.auth).send({ newPassword: 'Newpass123', currentPassword: 'nope' }).expect(400);
    await api().patch('/api/v1/users/me').set('Authorization', b.auth).send({ newPassword: 'Newpass123', currentPassword: 'Password123' }).expect(200);
    await api().patch('/api/v1/users/me').set('Authorization', b.auth).send({ roles: ['admin'] }).expect(400);
    const me = await api().get('/api/v1/users/me').set('Authorization', b.auth).expect(200);
    expect(me.body.data.name).toBe('Patricia');
  });

  it('manages addresses with a single default', async () => {
    const b = await makeBuyer();
    const body = { recipientName: 'Ann Buyer', phone: '5551112222', addressLine1: '1 Road', city: 'T', state: 'ON', postalCode: 'A1A1A1' };
    const a1 = await api().post('/api/v1/users/me/addresses').set('Authorization', b.auth).send(body).expect(201);
    expect(a1.body.data.isDefault).toBe(true);
    const a2 = await api().post('/api/v1/users/me/addresses').set('Authorization', b.auth).send({ ...body, isDefault: true }).expect(201);
    let list = await api().get('/api/v1/users/me/addresses').set('Authorization', b.auth).expect(200);
    expect(list.body.data.filter((a: any) => a.isDefault)).toHaveLength(1);
    await api().patch(`/api/v1/users/me/addresses/${a2.body.data._id}`).set('Authorization', b.auth).send({ city: 'Ottawa' }).expect(200);
    await api().delete(`/api/v1/users/me/addresses/${a2.body.data._id}`).set('Authorization', b.auth).expect(200);
    list = await api().get('/api/v1/users/me/addresses').set('Authorization', b.auth).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].isDefault).toBe(true);
    // another user cannot touch it
    const other = await makeBuyer('Other');
    await api().patch(`/api/v1/users/me/addresses/${a1.body.data._id}`).set('Authorization', other.auth).send({ city: 'X' }).expect(404);
    await api().delete(`/api/v1/users/me/addresses/${a1.body.data._id}`).set('Authorization', other.auth).expect(404);
  });

  it('returns 404 JSON for unknown routes and 400 for malformed JSON', async () => {
    const r = await api().get('/api/v1/nope').expect(404);
    expect(r.body.success).toBe(false);
    await api().post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad').expect(400);
  });

  it('strips NoSQL operators from input', async () => {
    await api().post('/api/v1/auth/register').send(reg).expect(201);
    await api().post('/api/v1/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } }).expect(400);
  });
});
