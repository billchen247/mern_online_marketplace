import { describe, expect, it } from 'vitest';
import { Settings, SellerApplication, User } from '../src/models/index.js';
import { api, makeAdmin, makeBuyer, makeCategory, makeSeller, makeShop } from './helpers.js';

const application = { businessName: 'Acme Goods', businessDescription: 'We sell many fine goods.', contactInformation: { email: 'acme@test.dev', phone: '5550001111' } };

describe('seller onboarding', () => {
  it('lets a user apply, admin approve, and keeps existing roles', async () => {
    const buyer = await makeBuyer('Applicant');
    const admin = await makeAdmin();
    await api().post('/api/v1/seller/shops').set('Authorization', buyer.auth).send({ name: 'Sneaky' }).expect(403);
    const created = await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send(application).expect(201);
    expect(created.body.data.applicationStatus).toBe('pending');
    await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send(application).expect(409);
    const mine = await api().get('/api/v1/seller-applications/me').set('Authorization', buyer.auth).expect(200);
    expect(mine.body.data.applicationStatus).toBe('pending');

    await api().patch(`/api/v1/admin/seller-applications/${created.body.data._id}`).set('Authorization', buyer.auth).send({ status: 'approved' }).expect(403);
    await api().patch(`/api/v1/admin/seller-applications/${created.body.data._id}`).set('Authorization', admin.auth).send({ status: 'approved', reviewNotes: 'ok' }).expect(200);
    await api().patch(`/api/v1/admin/seller-applications/${created.body.data._id}`).set('Authorization', admin.auth).send({ status: 'rejected' }).expect(409);

    const me = await api().get('/api/v1/auth/me').set('Authorization', buyer.auth).expect(200);
    expect(me.body.data.roles.sort()).toEqual(['seller', 'user']);
    await api().post('/api/v1/seller/shops').set('Authorization', buyer.auth).send({ name: 'Now Allowed' }).expect(201);
    await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send(application).expect(409);
  });

  it('rejection leaves the user a regular user', async () => {
    const buyer = await makeBuyer('Rejected');
    const admin = await makeAdmin();
    const a = await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send(application).expect(201);
    await api().patch(`/api/v1/admin/seller-applications/${a.body.data._id}`).set('Authorization', admin.auth).send({ status: 'rejected', reviewNotes: 'no' }).expect(200);
    expect((await User.findById(buyer.id))!.roles).toEqual(['user']);
    await api().post('/api/v1/seller/shops').set('Authorization', buyer.auth).send({ name: 'Nope' }).expect(403);
    // may re-apply after rejection
    await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send(application).expect(201);
  });

  it('approving an admin keeps the admin role', async () => {
    const admin = await makeAdmin('Boss');
    const other = await makeAdmin('Other Admin');
    const a = await api().post('/api/v1/seller-applications').set('Authorization', admin.auth).send(application).expect(201);
    await api().patch(`/api/v1/admin/seller-applications/${a.body.data._id}`).set('Authorization', other.auth).send({ status: 'approved' }).expect(200);
    expect((await User.findById(admin.id))!.roles.sort()).toEqual(['admin', 'seller', 'user']);
  });

  it('validates application payloads and lists by status', async () => {
    const buyer = await makeBuyer();
    const admin = await makeAdmin();
    await api().post('/api/v1/seller-applications').set('Authorization', buyer.auth).send({ businessName: 'x' }).expect(400);
    await SellerApplication.create({ user: buyer.id, ...application });
    const list = await api().get('/api/v1/admin/seller-applications?status=pending').set('Authorization', admin.auth).expect(200);
    expect(list.body.pagination.total).toBe(1);
  });

  it('admin can suspend and reactivate a seller', async () => {
    const admin = await makeAdmin();
    const seller = await makeSeller();
    await SellerApplication.create({ user: seller.id, ...application, applicationStatus: 'approved' });
    const shop = await makeShop(seller.id);
    await api().patch(`/api/v1/admin/sellers/${seller.id}`).set('Authorization', admin.auth).send({ action: 'suspend', notes: 'policy' }).expect(200);
    await api().get('/api/v1/seller/shops').set('Authorization', seller.auth).expect(403);
    await api().get(`/api/v1/shops/${shop._id}`).expect(404);
    await api().patch(`/api/v1/admin/sellers/${seller.id}`).set('Authorization', admin.auth).send({ action: 'suspend' }).expect(409);
    await api().patch(`/api/v1/admin/sellers/${seller.id}`).set('Authorization', admin.auth).send({ action: 'reactivate' }).expect(200);
    await api().get('/api/v1/seller/shops').set('Authorization', seller.auth).expect(200);
    await api().get(`/api/v1/shops/${shop._id}`).expect(200);
    const sellers = await api().get('/api/v1/admin/sellers').set('Authorization', admin.auth).expect(200);
    expect(sellers.body.data[0].shops).toBe(1);
  });
});

describe('shops & products (seller)', () => {
  it('CRUD shops with ownership enforcement', async () => {
    const a = await makeSeller('Owner A');
    const b = await makeSeller('Owner B');
    const s = await api().post('/api/v1/seller/shops').set('Authorization', a.auth).send({ name: 'My Shop', description: 'Nice', seller: b.id, status: 'suspended' }).expect(201);
    expect(s.body.data.seller).toBe(a.id); // seller id derived from auth, not body
    await api().post('/api/v1/seller/shops').set('Authorization', a.auth).send({ name: 'Second Shop' }).expect(201);
    const list = await api().get('/api/v1/seller/shops').set('Authorization', a.auth).expect(200);
    expect(list.body.data).toHaveLength(2);
    expect((await api().get('/api/v1/seller/shops').set('Authorization', b.auth)).body.data).toHaveLength(0);

    const id = s.body.data._id;
    await api().patch(`/api/v1/seller/shops/${id}`).set('Authorization', b.auth).send({ name: 'Hijack' }).expect(404);
    await api().delete(`/api/v1/seller/shops/${id}`).set('Authorization', b.auth).expect(404);
    await api().get(`/api/v1/seller/shops/${id}`).set('Authorization', b.auth).expect(404);
    const upd = await api().patch(`/api/v1/seller/shops/${id}`).set('Authorization', a.auth).send({ description: 'Updated', logo: { url: 'https://x.test/l.png', publicId: 'p1' } }).expect(200);
    expect(upd.body.data.description).toBe('Updated');
    await api().delete(`/api/v1/seller/shops/${id}`).set('Authorization', a.auth).expect(200);
    await api().get(`/api/v1/shops/${id}`).expect(404);
    await api().patch(`/api/v1/seller/shops/${id}`).set('Authorization', a.auth).send({ status: 'active' }).expect(200);
    await api().get(`/api/v1/shops/${id}`).expect(200);
    await api().post('/api/v1/seller/shops').set('Authorization', a.auth).send({ name: '' }).expect(400);
  });

  it('suspended shops cannot be reactivated by the owner', async () => {
    const a = await makeSeller();
    const shop = await makeShop(a.id, 'Bad Shop', 'suspended');
    await api().patch(`/api/v1/seller/shops/${shop._id}`).set('Authorization', a.auth).send({ status: 'active' }).expect(403);
  });

  it('CRUD products with ownership, SKU uniqueness and stock management', async () => {
    const a = await makeSeller('Prod A');
    const b = await makeSeller('Prod B');
    const cat = await makeCategory();
    const shopA = await makeShop(a.id, 'Shop PA');
    const shopB = await makeShop(b.id, 'Shop PB');
    const body = { shop: String(shopA._id), category: String(cat._id), name: 'Gizmo', description: 'A fine gizmo for all.', price: 19.99, stock: 5, sku: 'GZ-1', specifications: [{ key: 'Color', value: 'Red' }] };
    await api().post('/api/v1/seller/products').set('Authorization', b.auth).send(body).expect(404); // not B's shop
    const p = await api().post('/api/v1/seller/products').set('Authorization', a.auth).send(body).expect(201);
    expect(p.body.data.seller).toBe(a.id);
    await api().post('/api/v1/seller/products').set('Authorization', a.auth).send(body).expect(409);
    await api().post('/api/v1/seller/products').set('Authorization', a.auth).send({ ...body, sku: 'GZ-2', price: -1 }).expect(400);
    await api().post('/api/v1/seller/products').set('Authorization', a.auth).send({ ...body, sku: 'GZ-3', ratingAverage: 5 }).expect(400); // strict
    await api().post('/api/v1/seller/products').set('Authorization', a.auth).send({ ...body, sku: 'GZ-4', category: '507f1f77bcf86cd799439011' }).expect(400);
    const id = p.body.data._id;

    await api().patch(`/api/v1/seller/products/${id}`).set('Authorization', b.auth).send({ price: 1 }).expect(404);
    await api().delete(`/api/v1/seller/products/${id}`).set('Authorization', b.auth).expect(404);
    await api().patch(`/api/v1/seller/products/${id}`).set('Authorization', b.auth).send({ shop: String(shopB._id) }).expect(404);
    await api().patch(`/api/v1/seller/products/${id}`).set('Authorization', a.auth).send({ shop: String(shopB._id) }).expect(404); // cannot move into another seller's shop

    const upd = await api().patch(`/api/v1/seller/products/${id}`).set('Authorization', a.auth).send({ price: 24.5, discount: 10, stock: 8 }).expect(200);
    expect(upd.body.data.price).toBe(24.5);

    await api().patch(`/api/v1/seller/products/${id}/stock`).set('Authorization', a.auth).send({ adjustment: -20 }).expect(400);
    const s1 = await api().patch(`/api/v1/seller/products/${id}/stock`).set('Authorization', a.auth).send({ adjustment: -3, note: 'damaged' }).expect(200);
    expect(s1.body.data.stock).toBe(5);
    const s2 = await api().patch(`/api/v1/seller/products/${id}/stock`).set('Authorization', a.auth).send({ set: 50 }).expect(200);
    expect(s2.body.data.stock).toBe(50);
    await api().patch(`/api/v1/seller/products/${id}/stock`).set('Authorization', b.auth).send({ set: 1 }).expect(404);
    const hist = await api().get(`/api/v1/seller/products/${id}/inventory`).set('Authorization', a.auth).expect(200);
    expect(hist.body.data.length).toBeGreaterThanOrEqual(3);

    const mine = await api().get('/api/v1/seller/products?lowStock=true').set('Authorization', a.auth).expect(200);
    expect(mine.body.pagination.total).toBe(0);
    expect((await api().get('/api/v1/seller/products').set('Authorization', b.auth)).body.pagination.total).toBe(0);
    await api().get(`/api/v1/seller/products/${id}`).set('Authorization', a.auth).expect(200);
    await api().get(`/api/v1/seller/products/${id}`).set('Authorization', b.auth).expect(404);

    await api().delete(`/api/v1/seller/products/${id}`).set('Authorization', a.auth).expect(200);
    await api().get(`/api/v1/products/${id}`).expect(404);
    await api().get(`/api/v1/seller/products/${id}`).set('Authorization', a.auth).expect(404);
  });

  it('moderation settings put new shops/products into pending', async () => {
    const a = await makeSeller();
    const admin = await makeAdmin();
    await api().patch('/api/v1/admin/settings').set('Authorization', admin.auth).send({ moderation: { requireProductApproval: true, requireShopApproval: true } }).expect(200);
    const shop = await api().post('/api/v1/seller/shops').set('Authorization', a.auth).send({ name: 'Moderated' }).expect(201);
    expect(shop.body.data.status).toBe('pending');
    await api().patch(`/api/v1/seller/shops/${shop.body.data._id}`).set('Authorization', a.auth).send({ status: 'active' }).expect(403);
    await api().patch(`/api/v1/admin/shops/${shop.body.data._id}`).set('Authorization', admin.auth).send({ status: 'active' }).expect(200);
    const cat = await makeCategory();
    const p = await api().post('/api/v1/seller/products').set('Authorization', a.auth).send({ shop: shop.body.data._id, category: String(cat._id), name: 'Pending Item', description: 'Needs approval first.', price: 5, stock: 1, sku: 'PND' }).expect(201);
    expect(p.body.data.status).toBe('pending');
    await api().get(`/api/v1/products/${p.body.data._id}`).expect(404);
    await api().patch(`/api/v1/admin/products/${p.body.data._id}`).set('Authorization', admin.auth).send({ status: 'active' }).expect(200);
    await api().get(`/api/v1/products/${p.body.data._id}`).expect(200);
    await Settings.deleteMany({});
  });

  it('uploads images with type and content validation', async () => {
    const a = await makeSeller();
    const buyer = await makeBuyer();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await api().post('/api/v1/seller/uploads').set('Authorization', buyer.auth).attach('images', png, { filename: 'a.png', contentType: 'image/png' }).expect(403);
    const ok = await api().post('/api/v1/seller/uploads').set('Authorization', a.auth).attach('images', png, { filename: 'a.png', contentType: 'image/png' }).expect(201);
    expect(ok.body.data[0].url).toMatch(/^\/uploads\/.+\.png$/);
    await api().get(ok.body.data[0].url).expect(200);
    await api().post('/api/v1/seller/uploads').set('Authorization', a.auth).attach('images', Buffer.from('<script>'), { filename: 'a.png', contentType: 'image/png' }).expect(400);
    await api().post('/api/v1/seller/uploads').set('Authorization', a.auth).attach('images', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' }).expect(400);
    await api().post('/api/v1/seller/uploads').set('Authorization', a.auth).attach('images', Buffer.alloc(6 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' }).expect(413);
    await api().post('/api/v1/seller/uploads').set('Authorization', a.auth).expect(400);
  });
});
