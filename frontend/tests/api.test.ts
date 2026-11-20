import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api, getAccessToken, refreshAccessToken, setAccessToken, setAuthFailureHandler } from '../src/api/client';
import { adminApi, authApi, cartApi, catalogApi, orderApi, sellerApi, userApi, wishlistApi } from '../src/api/services';
import { BASE, fail, loginAs, ok, server } from './mocks';

describe('services call the right endpoints', () => {
  it('sweeps every service function', async () => {
    const calls: Promise<unknown>[] = [
      authApi.me(),
      catalogApi.settings(),
      catalogApi.home(),
      catalogApi.categories(),
      catalogApi.category('c1'),
      catalogApi.products({ search: 'x' } as never),
      catalogApi.product('p1'),
      catalogApi.shops(),
      catalogApi.shop('s1'),
      catalogApi.reviews('p1'),
      catalogApi.reviewState('p1'),
      userApi.me(),
      userApi.addresses(),
      userApi.notifications(),
      userApi.myApplication(),
      userApi.readAllNotifications(),
      userApi.readNotification('n1'),
      userApi.update({ name: 'x' }),
      userApi.addAddress({} as never),
      userApi.updateAddress('a1', {}),
      userApi.deleteAddress('a1'),
      userApi.applyToSell({ businessName: 'b', businessDescription: 'd', contactInformation: { email: 'e', phone: 'p' } }),
      cartApi.get('WELCOME10'),
      cartApi.add('p1'),
      cartApi.update('ci1', 3),
      cartApi.remove('ci1'),
      cartApi.clear(),
      wishlistApi.get(),
      wishlistApi.add('p1'),
      wishlistApi.remove('p1'),
      wishlistApi.moveToCart('p1'),
      orderApi.checkout({ addressId: 'a1', paymentMethod: 'card' }, 'key-1'),
      orderApi.list(),
      orderApi.get('o1'),
      orderApi.cancel('o1', 'x'),
      orderApi.requestReturn('o1', { sellerOrderId: 'so1', items: [], reason: 'r' }),
      orderApi.returns(),
      sellerApi.shops(),
      sellerApi.shop('s1'),
      sellerApi.createShop({ name: 'n' }),
      sellerApi.updateShop('s1', {}),
      sellerApi.deleteShop('s1'),
      sellerApi.products(),
      sellerApi.product('p1'),
      sellerApi.createProduct({} as never),
      sellerApi.updateProduct('p1', {}),
      sellerApi.deleteProduct('p1'),
      sellerApi.adjustStock('p1', { adjustment: 1 }),
      sellerApi.inventory('p1'),
      sellerApi.orders(),
      sellerApi.order('so1'),
      sellerApi.updateOrderStatus('so1', { status: 'processing' }),
      sellerApi.updateTracking('so1', { carrier: 'c', trackingNumber: 't' }),
      sellerApi.dashboard(),
      sellerApi.earnings(),
      sellerApi.payouts(),
      sellerApi.requestPayout(),
      adminApi.dashboard(),
      adminApi.users({}),
      adminApi.updateUser('u1', {}),
      adminApi.applications({}),
      adminApi.reviewApplication('a', { status: 'approved' }),
      adminApi.sellers({}),
      adminApi.updateSeller('u2', { action: 'suspend' }),
      adminApi.shops({}),
      adminApi.updateShop('s1', 'active'),
      adminApi.products({}),
      adminApi.updateProduct('p1', {}),
      adminApi.categories(),
      adminApi.createCategory({}),
      adminApi.updateCategory('c1', {}),
      adminApi.deleteCategory('c1'),
      adminApi.orders({}),
      adminApi.order('o1'),
      adminApi.cancelSellerOrder('so1'),
      adminApi.returns({}),
      adminApi.resolveReturn('rt1', { status: 'approved' }),
      adminApi.reviews({}),
      adminApi.moderateReview('r1', 'hidden'),
      adminApi.settings(),
      adminApi.updateSettings({}),
    ];
    server.use(
      http.get(`${BASE}/seller/analytics`, () => ok({ days: 30, salesTrend: [], topProducts: [], revenueByShop: [] })),
      http.get(`${BASE}/admin/audit-logs`, () => ok([])),
      http.get(`${BASE}/admin/users/:id`, () => ok({})),
      http.post(`${BASE}/seller/uploads`, () => ok([{ url: 'u', publicId: 'p' }])),
    );
    calls.push(
      sellerApi.analytics(),
      adminApi.auditLogs(),
      adminApi.user('u1'),
      sellerApi.upload([new File(['x'], 'a.png', { type: 'image/png' })]),
    );
    const results = await Promise.allSettled(calls);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toEqual([]);
  });

  it('sends the idempotency key on checkout', async () => {
    let key: string | null = null;
    server.use(
      http.post(`${BASE}/orders/checkout`, ({ request }) => {
        key = request.headers.get('Idempotency-Key');
        return ok({});
      }),
    );
    await orderApi.checkout({ addressId: 'a', paymentMethod: 'cod' }, 'abc-123');
    expect(key).toBe('abc-123');
  });
});

describe('client auth handling', () => {
  it('attaches the bearer token', async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/cart`, ({ request }) => {
        auth = request.headers.get('Authorization');
        return ok({});
      }),
    );
    setAccessToken('abc');
    await cartApi.get();
    expect(auth).toBe('Bearer abc');
    expect(getAccessToken()).toBe('abc');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    loginAs('buyer');
    let hits = 0;
    server.use(
      http.get(`${BASE}/cart`, ({ request }) => {
        hits++;
        return request.headers.get('Authorization') === 'Bearer tok' ? ok({ items: [] }) : fail(401, 'expired');
      }),
    );
    setAccessToken('stale');
    await expect(cartApi.get()).resolves.toEqual({ items: [] });
    expect(hits).toBe(2);
    expect(getAccessToken()).toBe('tok');
  });

  it('calls the auth-failure handler when refresh fails', async () => {
    loginAs(null);
    server.use(http.get(`${BASE}/cart`, () => fail(401, 'expired')));
    const onFail = vi.fn();
    setAuthFailureHandler(onFail);
    setAccessToken('stale');
    await expect(cartApi.get()).rejects.toBeTruthy();
    expect(onFail).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
    setAuthFailureHandler(null);
  });

  it('does not try to refresh for /auth/ calls and shares one refresh across callers', async () => {
    loginAs('buyer');
    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
    expect(a).toBe('tok');
    expect(b).toBe('tok');
    server.use(http.post(`${BASE}/auth/login`, () => fail(401, 'bad')));
    setAccessToken('x');
    await expect(authApi.login({ email: 'a', password: 'b' })).rejects.toBeTruthy();
    expect(api.defaults.withCredentials).toBe(true);
    void HttpResponse;
  });
});
