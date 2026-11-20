import request from 'supertest';
import { createApp } from '../src/app.js';
import { Address, Category, Product, Shop, User } from '../src/models/index.js';
import { hashPassword } from '../src/services/auth.service.js';
import { signAccessToken } from '../src/utils/tokens.js';

export const app = createApp();
export const api = () => request(app);

export async function makeUser(name: string, roles: ('user' | 'seller' | 'admin')[] = ['user'], extra: Record<string, unknown> = {}) {
  const user = await User.create({
    name,
    email: `${name.toLowerCase().replace(/\W+/g, '.')}@test.dev`,
    passwordHash: await hashPassword('Password123'),
    roles,
    ...extra,
  });
  const token = signAccessToken(String(user._id));
  return { user, id: String(user._id), token, auth: `Bearer ${token}` };
}

export const makeBuyer = (n = 'Buyer') => makeUser(n, ['user']);
export const makeSeller = (n = 'Seller') => makeUser(n, ['user', 'seller']);
export const makeAdmin = (n = 'Admin') => makeUser(n, ['user', 'admin']);

export async function makeCategory(name = 'Electronics') {
  return Category.create({ name, slug: name.toLowerCase().replace(/\W+/g, '-') });
}

export async function makeShop(sellerId: string, name = 'Shop One', status: 'active' | 'inactive' | 'suspended' | 'pending' = 'active') {
  return Shop.create({
    seller: sellerId,
    name,
    slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
    status,
  });
}

let skuN = 0;
export async function makeProduct(opts: {
  seller: string;
  shop: string;
  category: string;
  name?: string;
  price?: number;
  stock?: number;
  discount?: number;
  [k: string]: unknown;
}) {
  skuN += 1;
  const { seller, shop, category, name = `Product ${skuN}`, price = 20, stock = 10, discount = 0, ...rest } = opts;
  return Product.create({
    seller,
    shop,
    category,
    name,
    slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${skuN}`,
    description: 'A very decent test product description.',
    price,
    stock,
    discount,
    sku: `SKU-${skuN}`,
    ...rest,
  });
}

export async function makeAddress(userId: string) {
  return Address.create({
    user: userId,
    recipientName: 'Test Buyer',
    phone: '5551234567',
    addressLine1: '1 Main St',
    city: 'Toronto',
    state: 'ON',
    postalCode: 'M1M1M1',
    country: 'CA',
    isDefault: true,
  });
}

/** Seeds two sellers with two shops each product so multi-seller flows can be tested. */
export async function marketplaceFixture() {
  const [sellerA, sellerB, buyer, admin] = await Promise.all([
    makeSeller('Seller A'),
    makeSeller('Seller B'),
    makeBuyer('Buyer One'),
    makeAdmin('Admin One'),
  ]);
  const cat = await makeCategory();
  const shopA1 = await makeShop(sellerA.id, 'Shop A1');
  const shopA2 = await makeShop(sellerA.id, 'Shop A2');
  const shopB1 = await makeShop(sellerB.id, 'Shop B1');
  const pA1 = await makeProduct({
    seller: sellerA.id,
    shop: String(shopA1._id),
    category: String(cat._id),
    name: 'Alpha Laptop',
    price: 100,
    stock: 10,
  });
  const pA2 = await makeProduct({
    seller: sellerA.id,
    shop: String(shopA2._id),
    category: String(cat._id),
    name: 'Alpha Mouse',
    price: 25,
    stock: 5,
  });
  const pB1 = await makeProduct({
    seller: sellerB.id,
    shop: String(shopB1._id),
    category: String(cat._id),
    name: 'Beta Keyboard',
    price: 60,
    stock: 3,
    discount: 50,
  });
  const address = await makeAddress(buyer.id);
  return { sellerA, sellerB, buyer, admin, cat, shopA1, shopA2, shopB1, pA1, pA2, pB1, address };
}

export async function fillCart(auth: string, items: { id: string; qty: number }[]) {
  for (const i of items)
    await api().post('/api/v1/cart/items').set('Authorization', auth).send({ productId: i.id, quantity: i.qty }).expect(201);
}

export const checkoutBody = (addressId: string, extra: Record<string, unknown> = {}) => ({
  addressId,
  paymentMethod: 'card',
  paymentToken: 'tok_visa',
  ...extra,
});
