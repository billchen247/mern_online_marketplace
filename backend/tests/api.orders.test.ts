import { describe, expect, it } from 'vitest';
import { CommissionRecord, Notification, Order, Product, ReturnRequest, SellerOrder } from '../src/models/index.js';
import { api, checkoutBody, fillCart, makeBuyer, marketplaceFixture } from './helpers.js';

type Fx = Awaited<ReturnType<typeof marketplaceFixture>>;
const id = (x: { _id: unknown }) => String(x._id);

async function placeOrder(f: Fx, extra: Record<string, unknown> = {}) {
  await fillCart(f.buyer.auth, [
    { id: id(f.pA1), qty: 2 },
    { id: id(f.pB1), qty: 1 },
  ]);
  return api()
    .post('/api/v1/orders/checkout')
    .set('Authorization', f.buyer.auth)
    .send(checkoutBody(id(f.address), extra));
}
const stock = async (p: { _id: unknown }) => (await Product.findById(p._id))!.stock;

describe('cart & wishlist', () => {
  it('adds, merges, updates, removes and clears; enforces stock', async () => {
    const f = await marketplaceFixture();
    const a = f.buyer.auth;
    await api()
      .post('/api/v1/cart/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1), quantity: 3 })
      .expect(201);
    await api()
      .post('/api/v1/cart/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1), quantity: 2 })
      .expect(201);
    let cart = (await api().get('/api/v1/cart').set('Authorization', a)).body.data;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
    await api()
      .post('/api/v1/cart/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1), quantity: 6 })
      .expect(409); // 11 > stock 10
    await api()
      .post('/api/v1/cart/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1), quantity: 0 })
      .expect(400);
    await api().post('/api/v1/cart/items').set('Authorization', a).send({ productId: '507f1f77bcf86cd799439011', quantity: 1 }).expect(404);
    await api().patch(`/api/v1/cart/items/${cart.items[0].id}`).set('Authorization', a).send({ quantity: 11 }).expect(409);
    await api().patch(`/api/v1/cart/items/${cart.items[0].id}`).set('Authorization', a).send({ quantity: 1 }).expect(200);
    await api().get('/api/v1/cart').set('Authorization', f.admin.auth).expect(200); // separate cart
    await api().delete(`/api/v1/cart/items/${cart.items[0].id}`).set('Authorization', f.admin.auth).expect(404);
    await api().delete(`/api/v1/cart/items/${cart.items[0].id}`).set('Authorization', a).expect(200);
    await api()
      .post('/api/v1/cart/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA2), quantity: 1 })
      .expect(201);
    await api().delete('/api/v1/cart').set('Authorization', a).expect(200);
    cart = (await api().get('/api/v1/cart').set('Authorization', a)).body.data;
    expect(cart.items).toHaveLength(0);
    await api().get('/api/v1/cart').expect(401);
  });

  it('applies coupons in cart preview and flags unavailable products', async () => {
    const f = await marketplaceFixture();
    const a = f.buyer.auth;
    await fillCart(a, [{ id: id(f.pA1), qty: 1 }]);
    const base = (await api().get('/api/v1/cart').set('Authorization', a)).body.data.summary;
    const { Settings } = await import('../src/models/index.js');
    await Settings.findOneAndUpdate(
      {},
      { $set: { coupons: [{ code: 'SAVE10', percentOff: 10, minSubtotal: 0, active: true }] } },
      { upsert: true },
    );
    const withCoupon = (await api().get('/api/v1/cart?coupon=SAVE10').set('Authorization', a)).body.data.summary;
    expect(withCoupon.discount).toBe(10);
    expect(withCoupon.total).toBeLessThan(base.total);
    await Product.updateOne({ _id: f.pA1._id }, { stock: 0 });
    const c = (await api().get('/api/v1/cart').set('Authorization', a)).body.data;
    expect(c.hasIssues).toBe(true);
    expect(c.items[0].available).toBe(false);
  });

  it('wishlist add/list/remove/move-to-cart', async () => {
    const f = await marketplaceFixture();
    const a = f.buyer.auth;
    await api()
      .post('/api/v1/wishlist/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1) })
      .expect(200);
    await api()
      .post('/api/v1/wishlist/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA1) })
      .expect(200); // idempotent
    const w = await api().get('/api/v1/wishlist').set('Authorization', a).expect(200);
    expect(w.body.data).toHaveLength(1);
    await api()
      .post(`/api/v1/wishlist/items/${id(f.pA1)}/move-to-cart`)
      .set('Authorization', a)
      .expect(200);
    expect((await api().get('/api/v1/wishlist').set('Authorization', a)).body.data).toHaveLength(0);
    expect((await api().get('/api/v1/cart').set('Authorization', a)).body.data.items).toHaveLength(1);
    await api()
      .post('/api/v1/wishlist/items')
      .set('Authorization', a)
      .send({ productId: id(f.pA2) })
      .expect(200);
    await api()
      .delete(`/api/v1/wishlist/items/${id(f.pA2)}`)
      .set('Authorization', a)
      .expect(200);
  });
});

describe('checkout', () => {
  it('splits a multi-seller cart into parent + seller orders with reconciled totals and stock', async () => {
    const f = await marketplaceFixture();
    const res = await placeOrder(f);
    expect(res.status).toBe(201);
    const o = res.body.data;
    expect(o.sellerOrders).toHaveLength(2);
    const sum = (k: string) => Math.round(o.sellerOrders.reduce((s: number, x: any) => s + x[k], 0) * 100) / 100;
    expect(sum('subtotal')).toBe(o.subtotal);
    expect(sum('tax')).toBe(o.tax);
    expect(sum('shippingFee')).toBeCloseTo(o.shippingFee, 2);
    expect(sum('total')).toBeCloseTo(o.total, 2);
    expect(o.paymentStatus).toBe('paid');
    // snapshots use discounted price
    const b = o.sellerOrders.find((s: any) => s.items[0].name === 'Beta Keyboard');
    expect(b.items[0].unitPrice).toBe(30);
    expect(b.items[0].listPrice).toBe(60);
    expect(await stock(f.pA1)).toBe(8);
    expect(await stock(f.pB1)).toBe(2);
    expect(await CommissionRecord.countDocuments()).toBe(2);
    expect((await api().get('/api/v1/cart').set('Authorization', f.buyer.auth)).body.data.items).toHaveLength(0);
    expect(await Notification.countDocuments({ user: f.sellerA.id })).toBeGreaterThan(0);
    // price snapshot is stable after product price change
    await Product.updateOne({ _id: f.pA1._id }, { price: 999 });
    const detail = await api().get(`/api/v1/orders/${o._id}`).set('Authorization', f.buyer.auth).expect(200);
    expect(JSON.stringify(detail.body.data)).toContain('"unitPrice":100');
  });

  it('is idempotent for the same key', async () => {
    const f = await marketplaceFixture();
    await fillCart(f.buyer.auth, [{ id: id(f.pA1), qty: 1 }]);
    const body = checkoutBody(id(f.address), { idempotencyKey: 'idem-key-12345' });
    const r1 = await api().post('/api/v1/orders/checkout').set('Authorization', f.buyer.auth).send(body).expect(201);
    const r2 = await api().post('/api/v1/orders/checkout').set('Authorization', f.buyer.auth).send(body);
    expect([200, 201]).toContain(r2.status);
    expect(r2.body.data._id).toBe(r1.body.data._id);
    expect(await Order.countDocuments()).toBe(1);
    expect(await stock(f.pA1)).toBe(9);
  });

  it('honours the Idempotency-Key header', async () => {
    const f = await marketplaceFixture();
    await fillCart(f.buyer.auth, [{ id: id(f.pA1), qty: 1 }]);
    const send = () =>
      api()
        .post('/api/v1/orders/checkout')
        .set('Authorization', f.buyer.auth)
        .set('Idempotency-Key', 'hdr-key-98765')
        .send(checkoutBody(id(f.address)));
    const r1 = await send();
    const r2 = await send();
    expect(r2.body.data._id).toBe(r1.body.data._id);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('rejects empty carts, foreign addresses and bad payloads', async () => {
    const f = await marketplaceFixture();
    await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send(checkoutBody(id(f.address)))
      .expect(400);
    await fillCart(f.buyer.auth, [{ id: id(f.pA1), qty: 1 }]);
    const other = await makeBuyer('Other');
    await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', other.auth)
      .send(checkoutBody(id(f.address)))
      .expect(400);
    await api().post('/api/v1/orders/checkout').set('Authorization', f.buyer.auth).send({ addressId: 'x' }).expect(400);
    await api()
      .post('/api/v1/orders/checkout')
      .send(checkoutBody(id(f.address)))
      .expect(401);
    expect(await stock(f.pA1)).toBe(10);
  });

  it('fails cleanly on insufficient stock with nothing reserved', async () => {
    const f = await marketplaceFixture();
    await fillCart(f.buyer.auth, [
      { id: id(f.pA1), qty: 2 },
      { id: id(f.pB1), qty: 3 },
    ]);
    await Product.updateOne({ _id: f.pB1._id }, { stock: 1 });
    const r = await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send(checkoutBody(id(f.address)));
    expect(r.status).toBe(409);
    expect(await stock(f.pA1)).toBe(10);
    expect(await stock(f.pB1)).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
    expect(await SellerOrder.countDocuments()).toBe(0);
  });

  it('payment failure releases stock and creates no order', async () => {
    const f = await marketplaceFixture();
    await fillCart(f.buyer.auth, [
      { id: id(f.pA1), qty: 2 },
      { id: id(f.pB1), qty: 1 },
    ]);
    const r = await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send(checkoutBody(id(f.address), { paymentToken: 'tok_decline' }));
    expect(r.status).toBe(402);
    expect(await stock(f.pA1)).toBe(10);
    expect(await stock(f.pB1)).toBe(3);
    expect(await Order.countDocuments()).toBe(0);
    expect(await SellerOrder.countDocuments()).toBe(0);
    expect(await CommissionRecord.countDocuments()).toBe(0);
    expect((await api().get('/api/v1/cart').set('Authorization', f.buyer.auth)).body.data.items).toHaveLength(2);
    // retry with a good token works
    await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send(checkoutBody(id(f.address)))
      .expect(201);
  });

  it('cash on delivery leaves payment pending', async () => {
    const f = await marketplaceFixture();
    await fillCart(f.buyer.auth, [{ id: id(f.pA2), qty: 1 }]);
    const r = await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send({ addressId: id(f.address), paymentMethod: 'cod' })
      .expect(201);
    expect(r.body.data.paymentStatus).toBe('pending');
  });

  it('never oversells under concurrent checkouts', async () => {
    const f = await marketplaceFixture();
    await Product.updateOne({ _id: f.pB1._id }, { stock: 3 });
    const buyers = await Promise.all([1, 2, 3, 4, 5].map((i) => makeBuyer(`Racer ${i}`)));
    const { makeAddress } = await import('./helpers.js');
    const addrs = await Promise.all(buyers.map((b) => makeAddress(b.id)));
    for (const b of buyers) await fillCart(b.auth, [{ id: id(f.pB1), qty: 1 }]);
    const results = await Promise.all(
      buyers.map((b, i) =>
        api()
          .post('/api/v1/orders/checkout')
          .set('Authorization', b.auth)
          .send(checkoutBody(id(addrs[i]!))),
      ),
    );
    const ok = results.filter((r) => r.status === 201).length;
    expect(ok).toBe(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await stock(f.pB1)).toBe(0);
    expect(await Order.countDocuments()).toBe(3);
  });

  it('applies the seeded-style coupon and reconciles discount allocation', async () => {
    const f = await marketplaceFixture();
    const { Settings } = await import('../src/models/index.js');
    await Settings.findOneAndUpdate(
      {},
      { $set: { coupons: [{ code: 'TEN', percentOff: 10, minSubtotal: 0, active: true }] } },
      { upsert: true },
    );
    const r = await placeOrder(f, { couponCode: 'TEN' });
    expect(r.status).toBe(201);
    const o = r.body.data;
    expect(o.discount).toBe(23);
    const d = o.sellerOrders.reduce((s: number, x: any) => s + x.discount, 0);
    expect(Math.round(d * 100) / 100).toBe(23);
    await fillCart(f.buyer.auth, [{ id: id(f.pA2), qty: 1 }]);
    await api()
      .post('/api/v1/orders/checkout')
      .set('Authorization', f.buyer.auth)
      .send(checkoutBody(id(f.address), { couponCode: 'BOGUS' }))
      .expect(400);
  });
});

describe('order access & lifecycle', () => {
  it('buyers see only their own orders', async () => {
    const f = await marketplaceFixture();
    const o = (await placeOrder(f)).body.data;
    const other = await makeBuyer('Snoop');
    await api().get(`/api/v1/orders/${o._id}`).set('Authorization', other.auth).expect(404);
    await api().post(`/api/v1/orders/${o._id}/cancel`).set('Authorization', other.auth).send({}).expect(404);
    expect((await api().get('/api/v1/orders').set('Authorization', other.auth)).body.pagination.total).toBe(0);
    const mine = await api().get('/api/v1/orders').set('Authorization', f.buyer.auth).expect(200);
    expect(mine.body.pagination.total).toBe(1);
    await api().get('/api/v1/orders/not-an-id').set('Authorization', f.buyer.auth).expect(404);
  });

  it('sellers see only their sub-orders and cannot touch others', async () => {
    const f = await marketplaceFixture();
    await placeOrder(f);
    const a = (await api().get('/api/v1/seller/orders').set('Authorization', f.sellerA.auth)).body.data;
    const b = (await api().get('/api/v1/seller/orders').set('Authorization', f.sellerB.auth)).body.data;
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    await api().get(`/api/v1/seller/orders/${b[0]._id}`).set('Authorization', f.sellerA.auth).expect(404);
    await api()
      .patch(`/api/v1/seller/orders/${b[0]._id}/status`)
      .set('Authorization', f.sellerA.auth)
      .send({ status: 'processing' })
      .expect(404);
    await api()
      .patch(`/api/v1/seller/orders/${b[0]._id}/tracking`)
      .set('Authorization', f.sellerA.auth)
      .send({ carrier: 'UPS', trackingNumber: 'TRK123' })
      .expect(404);
    await api().get('/api/v1/seller/orders').set('Authorization', f.buyer.auth).expect(403);
  });

  it('fulfilment: invalid transitions rejected; full path derives parent status, earnings and notifications', async () => {
    const f = await marketplaceFixture();
    const o = (await placeOrder(f)).body.data;
    const a = (await api().get('/api/v1/seller/orders').set('Authorization', f.sellerA.auth)).body.data[0];
    const b = (await api().get('/api/v1/seller/orders').set('Authorization', f.sellerB.auth)).body.data[0];
    const set = (who: any, so: any, body: any) =>
      api().patch(`/api/v1/seller/orders/${so._id}/status`).set('Authorization', who.auth).send(body);
    await set(f.sellerA, a, { status: 'delivered' }).expect(409); // skip steps
    await set(f.sellerA, a, { status: 'shipped' }).expect(409);
    await set(f.sellerA, a, { status: 'processing' }).expect(200);
    await api()
      .patch(`/api/v1/seller/orders/${a._id}/tracking`)
      .set('Authorization', f.sellerA.auth)
      .send({ carrier: 'UPS', trackingNumber: 'TRK123', trackingUrl: 'https://ups.test/TRK123' })
      .expect(200);
    await set(f.sellerA, a, { status: 'shipped', carrier: 'UPS', trackingNumber: 'TRK12345' }).expect(200);
    let parent = (await api().get(`/api/v1/orders/${o._id}`).set('Authorization', f.buyer.auth)).body.data;
    expect(['processing', 'partially_fulfilled', 'partially_shipped', 'shipped', 'paid']).toContain(parent.orderStatus);
    await set(f.sellerA, a, { status: 'delivered' }).expect(200);
    await set(f.sellerA, a, { status: 'cancelled' }).expect(409);
    await set(f.sellerB, b, { status: 'processing' }).expect(200);
    await set(f.sellerB, b, { status: 'shipped', carrier: 'UPS', trackingNumber: 'TRK12345' }).expect(200);
    await set(f.sellerB, b, { status: 'delivered' }).expect(200);
    parent = (await api().get(`/api/v1/orders/${o._id}`).set('Authorization', f.buyer.auth)).body.data;
    expect(parent.orderStatus).toBe('delivered');
    expect(await Notification.countDocuments({ user: f.buyer.id })).toBeGreaterThan(1);
    const earn = await api().get('/api/v1/seller/earnings').set('Authorization', f.sellerA.auth).expect(200);
    expect(JSON.stringify(earn.body)).toContain('180');
    const dash = await api().get('/api/v1/seller/dashboard').set('Authorization', f.sellerA.auth).expect(200);
    expect(dash.body.data).toBeTruthy();
    await api().get('/api/v1/seller/analytics?days=7').set('Authorization', f.sellerA.auth).expect(200);
    await api().get('/api/v1/seller/analytics?days=1').set('Authorization', f.sellerA.auth).expect(400);
  });

  it('buyer cancel: pending cancels immediately and restocks; processing becomes a request', async () => {
    const f = await marketplaceFixture();
    const o = (await placeOrder(f)).body.data;
    const a = (await api().get('/api/v1/seller/orders').set('Authorization', f.sellerA.auth)).body.data[0];
    await api()
      .patch(`/api/v1/seller/orders/${a._id}/status`)
      .set('Authorization', f.sellerA.auth)
      .send({ status: 'processing' })
      .expect(200);
    const r = await api()
      .post(`/api/v1/orders/${o._id}/cancel`)
      .set('Authorization', f.buyer.auth)
      .send({ reason: 'changed my mind' })
      .expect(200);
    expect(r.body.data).toBeTruthy();
    expect(await stock(f.pB1)).toBe(3); // B pending -> cancelled and restocked
    expect(await stock(f.pA1)).toBe(8); // A processing -> only requested
    const so = await SellerOrder.findById(a._id);
    expect(so!.cancellationRequested).toBe(true);
    expect(so!.fulfillmentStatus).toBe('processing');
    // seller approves by cancelling
    await api()
      .patch(`/api/v1/seller/orders/${a._id}/status`)
      .set('Authorization', f.sellerA.auth)
      .send({ status: 'cancelled' })
      .expect(200);
    expect(await stock(f.pA1)).toBe(10);
    const parent = await Order.findById(o._id);
    expect(parent!.orderStatus).toBe('cancelled');
    expect(['refunded', 'partially_refunded']).toContain(parent!.paymentStatus);
    await api().post(`/api/v1/orders/${o._id}/cancel`).set('Authorization', f.buyer.auth).send({}).expect(409);
  });

  it('admin can view and cancel any seller order', async () => {
    const f = await marketplaceFixture();
    const o = (await placeOrder(f)).body.data;
    const list = await api().get('/api/v1/admin/orders').set('Authorization', f.admin.auth).expect(200);
    expect(list.body.pagination.total).toBe(1);
    await api().get(`/api/v1/admin/orders/${o._id}`).set('Authorization', f.admin.auth).expect(200);
    await api().get('/api/v1/admin/orders').set('Authorization', f.buyer.auth).expect(403);
    await api()
      .post(`/api/v1/admin/seller-orders/${o.sellerOrders[0]._id}/cancel`)
      .set('Authorization', f.admin.auth)
      .send({ reason: 'fraud' })
      .expect(200);
    expect((await SellerOrder.findById(o.sellerOrders[0]._id))!.fulfillmentStatus).toBe('cancelled');
    const adm = await api().get('/api/v1/admin/dashboard').set('Authorization', f.admin.auth).expect(200);
    expect(adm.body.data).toBeTruthy();
  });
});

async function deliveredOrder(f: Fx) {
  const o = (await placeOrder(f)).body.data;
  for (const [who, so] of [
    [f.sellerA, o.sellerOrders.find((s: any) => s.seller.name === 'Seller A')],
    [f.sellerB, o.sellerOrders.find((s: any) => s.seller.name === 'Seller B')],
  ] as const) {
    for (const status of ['processing', 'shipped', 'delivered'])
      await api()
        .patch(`/api/v1/seller/orders/${so._id}/status`)
        .set('Authorization', who.auth)
        .send({ status, carrier: 'UPS', trackingNumber: 'TRK12345' })
        .expect(200);
  }
  return o;
}

describe('reviews, returns & refunds', () => {
  it('only verified purchasers after delivery can review; one review per product; ratings aggregate', async () => {
    const f = await marketplaceFixture();
    const p = `/api/v1/products/${id(f.pA1)}/reviews`;
    await api().post(p).send({ rating: 5, comment: 'Great' }).expect(401);
    await api().post(p).set('Authorization', f.buyer.auth).send({ rating: 5, comment: 'Great' }).expect(403); // not purchased
    await deliveredOrder(f);
    const state = await api().get(`${p}/me`).set('Authorization', f.buyer.auth).expect(200);
    expect(state.body.data.eligible).toBe(true);
    await api().post(p).set('Authorization', f.buyer.auth).send({ rating: 9, comment: 'Great' }).expect(400);
    await api().post(p).set('Authorization', f.buyer.auth).send({ rating: 4, title: 'Nice', comment: 'Works well' }).expect(201);
    await api().post(p).set('Authorization', f.buyer.auth).send({ rating: 5, comment: 'Again' }).expect(409);
    const prod = await Product.findById(f.pA1._id);
    expect(prod!.ratingAverage).toBe(4);
    expect(prod!.ratingCount).toBe(1);
    const list = await api().get(p).expect(200);
    expect(list.body.data).toHaveLength(1);
    const rid = list.body.data[0]._id;
    const other = await makeBuyer('Not Owner');
    await api().patch(`/api/v1/reviews/${rid}`).set('Authorization', other.auth).send({ rating: 1 }).expect(403);
    await api().patch(`/api/v1/reviews/${rid}`).set('Authorization', f.buyer.auth).send({ rating: 2 }).expect(200);
    expect((await Product.findById(f.pA1._id))!.ratingAverage).toBe(2);
    // admin moderation
    await api().patch(`/api/v1/reviews/${rid}`).set('Authorization', f.buyer.auth).send({ status: 'hidden' }).expect(403);
    const adminList = await api().get('/api/v1/admin/reviews').set('Authorization', f.admin.auth).expect(200);
    expect(adminList.body.data.length).toBe(1);
    await api().delete(`/api/v1/reviews/${rid}`).set('Authorization', other.auth).expect(403);
    await api().delete(`/api/v1/reviews/${rid}`).set('Authorization', f.buyer.auth).expect(200);
    expect((await Product.findById(f.pA1._id))!.ratingCount).toBe(0);
  });

  it('returns only for delivered orders; admin approve/refund restocks and adjusts earnings', async () => {
    const f = await marketplaceFixture();
    const o = (await placeOrder(f)).body.data;
    const soA = o.sellerOrders.find((s: any) => s.seller.name === 'Seller A');
    const body = { sellerOrderId: soA._id, items: [{ itemId: soA.items[0]._id, quantity: 1 }], reason: 'Item defective' };
    await api().post(`/api/v1/orders/${o._id}/returns`).set('Authorization', f.buyer.auth).send(body).expect(409); // not delivered
    for (const status of ['processing', 'shipped', 'delivered'])
      await api()
        .patch(`/api/v1/seller/orders/${soA._id}/status`)
        .set('Authorization', f.sellerA.auth)
        .send({ status, carrier: 'UPS', trackingNumber: 'TRK12345' })
        .expect(200);
    const other = await makeBuyer('Stranger');
    await api().post(`/api/v1/orders/${o._id}/returns`).set('Authorization', other.auth).send(body).expect(404);
    await api()
      .post(`/api/v1/orders/${o._id}/returns`)
      .set('Authorization', f.buyer.auth)
      .send({ ...body, items: [{ itemId: soA.items[0]._id, quantity: 5 }] })
      .expect(400);
    await api()
      .post(`/api/v1/orders/${o._id}/returns`)
      .set('Authorization', f.buyer.auth)
      .send({ ...body, reason: 'x' })
      .expect(400);
    const ret = await api().post(`/api/v1/orders/${o._id}/returns`).set('Authorization', f.buyer.auth).send(body).expect(201);
    expect(ret.body.data.status).toBe('requested');
    expect((await api().get('/api/v1/returns').set('Authorization', f.buyer.auth)).body.data).toHaveLength(1);
    const rid = ret.body.data._id;
    await api().patch(`/api/v1/admin/returns/${rid}`).set('Authorization', f.sellerA.auth).send({ status: 'refunded' }).expect(403);
    await api().patch(`/api/v1/admin/returns/${rid}`).set('Authorization', f.admin.auth).send({ status: 'approved' }).expect(200);
    const stockBefore = await stock(f.pA1);
    const done = await api()
      .patch(`/api/v1/admin/returns/${rid}`)
      .set('Authorization', f.admin.auth)
      .send({ status: 'refunded', adminNotes: 'ok' })
      .expect(200);
    expect(done.body.data.status).toBe('refunded');
    expect(await stock(f.pA1)).toBe(stockBefore + 1);
    const so = await SellerOrder.findById(soA._id);
    expect(so!.refundedAmount).toBeGreaterThan(0);
    expect(so!.items[0]!.returnedQuantity).toBe(1);
    const parent = await Order.findById(o._id);
    expect(parent!.refundedAmount).toBeGreaterThan(0);
    await api().patch(`/api/v1/admin/returns/${rid}`).set('Authorization', f.admin.auth).send({ status: 'rejected' }).expect(409);
    // cannot return more than purchased in total
    await api()
      .post(`/api/v1/orders/${o._id}/returns`)
      .set('Authorization', f.buyer.auth)
      .send({ ...body, items: [{ itemId: soA.items[0]._id, quantity: 2 }] })
      .expect(400);
    const rec = await CommissionRecord.findOne({ sellerOrder: soA._id });
    expect(rec).toBeTruthy();
    expect(await ReturnRequest.countDocuments()).toBe(1);
    const adminReturns = await api().get('/api/v1/admin/returns?status=refunded').set('Authorization', f.admin.auth).expect(200);
    expect(adminReturns.body.pagination.total).toBe(1);
  });

  it('rejected returns change nothing', async () => {
    const f = await marketplaceFixture();
    const o = await deliveredOrder(f);
    const so = o.sellerOrders[1];
    const ret = await api()
      .post(`/api/v1/orders/${o._id}/returns`)
      .set('Authorization', f.buyer.auth)
      .send({ sellerOrderId: so._id, items: [{ itemId: so.items[0]._id, quantity: 1 }], reason: 'Changed mind' })
      .expect(201);
    await api()
      .patch(`/api/v1/admin/returns/${ret.body.data._id}`)
      .set('Authorization', f.admin.auth)
      .send({ status: 'rejected', adminNotes: 'no' })
      .expect(200);
    expect((await Order.findById(o._id))!.refundedAmount).toBe(0);
  });
});

describe('payouts & notifications', () => {
  it('seller requests a payout for available earnings only', async () => {
    const f = await marketplaceFixture();
    await api().post('/api/v1/seller/payouts').set('Authorization', f.sellerA.auth).expect(400); // nothing available
    await deliveredOrder(f);
    const r = await api().post('/api/v1/seller/payouts').set('Authorization', f.sellerA.auth);
    expect([200, 201]).toContain(r.status);
    await api().post('/api/v1/seller/payouts').set('Authorization', f.sellerA.auth).expect(400);
    const list = await api().get('/api/v1/seller/payouts').set('Authorization', f.sellerA.auth).expect(200);
    expect(list.body.data.data.length).toBe(1);
  });

  it('notifications list, mark read, read-all; scoped per user', async () => {
    const f = await marketplaceFixture();
    await placeOrder(f);
    const list = await api().get('/api/v1/notifications').set('Authorization', f.buyer.auth).expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    const nid = list.body.data[0]._id;
    await api().patch(`/api/v1/notifications/${nid}/read`).set('Authorization', f.sellerA.auth).expect(404);
    await api().patch(`/api/v1/notifications/${nid}/read`).set('Authorization', f.buyer.auth).expect(200);
    await api().post('/api/v1/notifications/read-all').set('Authorization', f.buyer.auth).expect(200);
    expect(await Notification.countDocuments({ user: f.buyer.id, read: false })).toBe(0);
  });
});
