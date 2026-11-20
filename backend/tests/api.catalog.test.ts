import { describe, expect, it } from 'vitest';
import { Category } from '../src/models/index.js';
import { api, makeAdmin, makeCategory, makeProduct, makeSeller, makeShop } from './helpers.js';

async function seedCatalog() {
  const s1 = await makeSeller('Cat S1');
  const s2 = await makeSeller('Cat S2');
  const electronics = await makeCategory('Electronics');
  const fashion = await makeCategory('Fashion');
  const sh1 = await makeShop(s1.id, 'Cat Shop 1');
  const sh2 = await makeShop(s2.id, 'Cat Shop 2');
  const hidden = await makeShop(s2.id, 'Hidden Shop', 'inactive');
  const e = String(electronics._id);
  const f = String(fashion._id);
  await makeProduct({ seller: s1.id, shop: String(sh1._id), category: e, name: 'Gaming Laptop', price: 1000, stock: 4, ratingAverage: 4.5, ratingCount: 10, salesCount: 30 });
  await makeProduct({ seller: s1.id, shop: String(sh1._id), category: e, name: 'Office Laptop', price: 600, stock: 0, ratingAverage: 3.2, ratingCount: 5, salesCount: 50 });
  await makeProduct({ seller: s1.id, shop: String(sh1._id), category: e, name: 'Phone Case', price: 15, stock: 100, description: 'Protects your laptop sleeve phone', ratingAverage: 4.9, ratingCount: 3, salesCount: 5 });
  await makeProduct({ seller: s2.id, shop: String(sh2._id), category: f, name: 'Silk Scarf', price: 45, stock: 8, ratingAverage: 4, ratingCount: 2, salesCount: 9 });
  await makeProduct({ seller: s2.id, shop: String(sh2._id), category: f, name: 'Draft Item', price: 5, stock: 8, status: 'draft' });
  await makeProduct({ seller: s2.id, shop: String(hidden._id), category: f, name: 'Hidden Shop Item', price: 5, stock: 8 });
  return { s1, s2, electronics, fashion, sh1, sh2 };
}

describe('product discovery', () => {
  it('lists active products from active shops with pagination metadata', async () => {
    await seedCatalog();
    const res = await api().get('/api/v1/products?limit=2&page=1').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    const p2 = await api().get('/api/v1/products?limit=2&page=2').expect(200);
    expect(p2.body.data).toHaveLength(2);
    expect(res.body.data[0].finalPrice).toBeDefined();
  });

  it('searches name and description case-insensitively and escapes regex input', async () => {
    await seedCatalog();
    const r = await api().get('/api/v1/products?search=LAPTOP').expect(200);
    expect(r.body.data.map((p: any) => p.name).sort()).toEqual(['Gaming Laptop', 'Office Laptop', 'Phone Case']);
    const none = await api().get('/api/v1/products?search=.*').expect(200);
    expect(none.body.data).toHaveLength(0);
  });

  it('filters by category (id and slug), shop, seller, price, rating, availability', async () => {
    const { electronics, sh2, s2 } = await seedCatalog();
    expect((await api().get(`/api/v1/products?category=${electronics._id}`)).body.pagination.total).toBe(3);
    expect((await api().get('/api/v1/products?category=fashion')).body.pagination.total).toBe(1);
    expect((await api().get(`/api/v1/products?shop=${sh2._id}`)).body.pagination.total).toBe(1);
    expect((await api().get(`/api/v1/products?seller=${s2.id}`)).body.pagination.total).toBe(1);
    expect((await api().get('/api/v1/products?minPrice=40&maxPrice=700')).body.data.map((p: any) => p.name).sort()).toEqual(['Office Laptop', 'Silk Scarf']);
    expect((await api().get('/api/v1/products?minRating=4.5')).body.data).toHaveLength(2);
    expect((await api().get('/api/v1/products?inStock=true')).body.pagination.total).toBe(3);
    expect((await api().get('/api/v1/products?category=nonexistent')).body.pagination.total).toBe(0);
  });

  it('sorts by price, popularity, rating and newest', async () => {
    await seedCatalog();
    const names = async (q: string) => (await api().get(`/api/v1/products?${q}`)).body.data.map((p: any) => p.name);
    expect((await names('sortBy=price&order=asc'))[0]).toBe('Phone Case');
    expect((await names('sortBy=price&order=desc'))[0]).toBe('Gaming Laptop');
    expect((await names('sortBy=popularity'))[0]).toBe('Office Laptop');
    expect((await names('sortBy=rating'))[0]).toBe('Phone Case');
    expect((await names('sortBy=newest'))[0]).toBe('Silk Scarf');
  });

  it('validates query parameters', async () => {
    await api().get('/api/v1/products?sortBy=hax').expect(400);
    await api().get('/api/v1/products?limit=1000').expect(400);
    await api().get('/api/v1/products?page=0').expect(400);
    await api().get('/api/v1/products?shop=bad').expect(400);
  });

  it('product detail includes shop, seller, related; hides inactive/unknown', async () => {
    await seedCatalog();
    const list = await api().get('/api/v1/products?search=Gaming').expect(200);
    const id = list.body.data[0]._id;
    const d = await api().get(`/api/v1/products/${id}`).expect(200);
    expect(d.body.data.shop.name).toBe('Cat Shop 1');
    expect(d.body.data.seller.name).toBe('Cat S1');
    expect(d.body.data.related.length).toBeGreaterThan(0);
    expect(d.body.data.related.every((r: any) => String(r._id) !== id)).toBe(true);
    const bySlug = await api().get(`/api/v1/products/${d.body.data.slug}`).expect(200);
    expect(bySlug.body.data._id).toBe(id);
    await api().get('/api/v1/products/507f1f77bcf86cd799439011').expect(404);
    await api().get('/api/v1/products/not-a-real-slug').expect(404);
  });

  it('home aggregates sections; shops list/detail; settings public', async () => {
    await seedCatalog();
    const h = await api().get('/api/v1/home').expect(200);
    expect(Object.keys(h.body.data)).toEqual(expect.arrayContaining(['featured', 'popular', 'newArrivals', 'recommended', 'shops', 'categories']));
    const shops = await api().get('/api/v1/shops').expect(200);
    expect(shops.body.pagination.total).toBe(2);
    expect(shops.body.data.find((s: any) => s.name === 'Cat Shop 1').productCount).toBe(3);
    expect((await api().get('/api/v1/shops?search=shop 2')).body.data).toHaveLength(1);
    const detail = await api().get(`/api/v1/shops/${shops.body.data[0]._id}`).expect(200);
    expect(detail.body.data.name).toBeTruthy();
    const settings = await api().get('/api/v1/settings/public').expect(200);
    expect(settings.body.data.shipping.flatRate).toBeGreaterThan(0);
  });
});

describe('categories', () => {
  it('admin manages categories; delete is guarded', async () => {
    const admin = await makeAdmin();
    const seller = await makeSeller();
    await api().post('/api/v1/admin/categories').set('Authorization', seller.auth).send({ name: 'X' }).expect(403);
    const c = await api().post('/api/v1/admin/categories').set('Authorization', admin.auth).send({ name: 'Toys', description: 'fun' }).expect(201);
    expect(c.body.data.slug).toBe('toys');
    await api().post('/api/v1/admin/categories').set('Authorization', admin.auth).send({ name: 'Toys' }).expect(409);
    const child = await api().post('/api/v1/admin/categories').set('Authorization', admin.auth).send({ name: 'Puzzles', parentCategory: c.body.data._id }).expect(201);
    await api().patch(`/api/v1/admin/categories/${c.body.data._id}`).set('Authorization', admin.auth).send({ parentCategory: c.body.data._id }).expect(400);
    await api().patch(`/api/v1/admin/categories/${c.body.data._id}`).set('Authorization', admin.auth).send({ name: 'Toys & Games' }).expect(200);
    await api().delete(`/api/v1/admin/categories/${c.body.data._id}`).set('Authorization', admin.auth).expect(409); // has child
    const shop = await makeShop(seller.id);
    await makeProduct({ seller: seller.id, shop: String(shop._id), category: child.body.data._id });
    await api().delete(`/api/v1/admin/categories/${child.body.data._id}`).set('Authorization', admin.auth).expect(409); // has products
    const empty = await makeCategory('Empty');
    await api().delete(`/api/v1/admin/categories/${empty._id}`).set('Authorization', admin.auth).expect(200);
    expect(await Category.exists({ _id: empty._id })).toBeNull();
    const pub = await api().get('/api/v1/categories').expect(200);
    expect(pub.body.data.length).toBe(2);
    await api().get(`/api/v1/categories/${c.body.data._id}`).expect(200);
    await api().get('/api/v1/categories/toys-games').expect(200);
    await api().get('/api/v1/categories/zzz').expect(404);
    const all = await api().get('/api/v1/admin/categories').set('Authorization', admin.auth).expect(200);
    expect(all.body.data.length).toBe(2);
  });
});
