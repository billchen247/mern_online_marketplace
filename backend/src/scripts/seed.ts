import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Address, Category, Notification, PayoutRecord, Product, ReturnRequest, SellerApplication, Shop, User } from '../models/index.js';
import * as cart from '../services/cart.service.js';
import { hashPassword } from '../services/auth.service.js';
import * as orders from '../services/order.service.js';
import * as returns from '../services/return.service.js';
import * as reviews from '../services/review.service.js';
import * as sellerOrders from '../services/sellerOrder.service.js';
import { getSettings } from '../services/settings.service.js';
import { ensureIndexes } from '../utils/indexes.js';
import { slugify } from '../utils/helpers.js';
import { CATEGORIES, DEMO_PASSWORD, PRODUCTS, SHOPS, USERS, imageFor } from './seedData.js';

/**
 * Idempotent demo-data seeder. Re-running never duplicates records:
 * every entity is looked up by a natural key (email, slug, sku, idempotency key) before creation.
 * Existing records (and stock levels) are left untouched. Pass `reset: true` to wipe first (never in production).
 */
export async function seedDatabase(opts: { reset?: boolean; log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  if (env.isProd) throw new Error('Refusing to seed: NODE_ENV=production');
  if (opts.reset) {
    await mongoose.connection.dropDatabase();
    log('Database dropped (reset)');
  }
  await ensureIndexes();
  await getSettings();
  await Settings_ensureCoupon();

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users: Record<string, any> = {};
  for (const u of USERS) {
    users[u.key] =
      (await User.findOne({ email: u.email })) ??
      (await User.create({ name: u.name, email: u.email, passwordHash, roles: [...u.roles] as any }));
  }
  log(`Users: ${USERS.length}`);

  const cats: Record<string, any> = {};
  for (const c of CATEGORIES) {
    cats[c.name] =
      (await Category.findOne({ name: c.name })) ??
      (await Category.create({ ...c, slug: slugify(c.name), image: imageFor(slugify(c.name), 9) }));
  }

  const shops: Record<string, any> = {};
  for (const s of SHOPS) {
    const slug = slugify(s.name);
    shops[s.key] =
      (await Shop.findOne({ slug })) ??
      (await Shop.create({
        seller: users[s.owner]._id,
        name: s.name,
        slug,
        description: s.description,
        logo: { url: imageFor(slug, 1) },
        banner: { url: `https://picsum.photos/seed/${slug}-banner/1400/400` },
        contact: { email: `${slug}@example.com`, phone: '+1 555 0100' },
        status: 'active',
      }));
  }

  const products: Record<string, any> = {};
  for (const p of PRODUCTS) {
    const shop = shops[p.shop];
    let doc = await Product.findOne({ shop: shop._id, sku: p.sku });
    if (!doc) {
      const slug = slugify(p.name);
      doc = await Product.create({
        seller: shop.seller,
        shop: shop._id,
        category: cats[p.cat]._id,
        name: p.name,
        slug,
        description: p.desc,
        images: [0, 1, 2].map((n) => ({ url: imageFor(slug, n) })),
        price: p.price,
        discount: p.discount ?? 0,
        stock: p.stock,
        sku: p.sku,
        specifications: p.specs.map(([key, value]) => ({ key, value })),
        featured: Boolean(p.featured),
        status: 'active',
      });
    }
    products[p.sku] = doc;
  }
  log(`Products: ${PRODUCTS.length}`);

  // Seller applications
  const apps: [string, string, string][] = [
    ['sam', 'approved', 'Sam Electronics & Home LLC'],
    ['sofia', 'approved', 'Sofia Outdoor Co.'],
    ['sunny', 'approved', 'Sunny Living Ltd.'],
    ['erin', 'pending', "Erin's Handmade Candles"],
    ['dave', 'rejected', 'Dave Dropship'],
  ];
  for (const [key, status, businessName] of apps) {
    if (await SellerApplication.exists({ user: users[key]._id })) continue;
    await SellerApplication.create({
      user: users[key]._id,
      businessName,
      businessDescription: `${businessName} sells quality products to customers across the country.`,
      contactInformation: { email: users[key].email, phone: '+1 555 0123' },
      applicationStatus: status as any,
      reviewNotes: status === 'rejected' ? 'Insufficient business information provided.' : undefined,
      reviewedBy: status === 'pending' ? undefined : users.admin._id,
      reviewedAt: status === 'pending' ? undefined : new Date(),
    });
  }

  // Addresses for buyers
  for (const key of ['alice', 'bob', 'carol', 'dave']) {
    if (await Address.exists({ user: users[key]._id })) continue;
    await Address.create({
      user: users[key]._id,
      recipientName: users[key].name,
      phone: '+1 555 0199',
      addressLine1: '100 Market Street',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5V 2T6',
      country: 'CA',
      isDefault: true,
    });
  }
  const addr = async (key: string) => String((await Address.findOne({ user: users[key]._id }))!._id);

  // Sample orders placed through the real checkout service (idempotent via idempotency keys).
  const plan: { key: string; buyer: string; items: [string, number][]; deliver: 'all' | 'some' | 'none'; coupon?: string }[] = [
    {
      key: 'seed-order-1',
      buyer: 'alice',
      items: [
        ['GG-HP-001', 1],
        ['UT-JK-001', 1],
      ],
      deliver: 'all',
    },
    {
      key: 'seed-order-2',
      buyer: 'bob',
      items: [
        ['TP-TN-001', 1],
        ['HH-BL-001', 1],
        ['AP-CH-001', 2],
      ],
      deliver: 'some',
    },
    {
      key: 'seed-order-3',
      buyer: 'carol',
      items: [
        ['SL-LP-001', 1],
        ['GG-SP-004', 1],
      ],
      deliver: 'none',
      coupon: 'WELCOME10',
    },
    {
      key: 'seed-order-4',
      buyer: 'dave',
      items: [
        ['GG-SP-004', 1],
        ['SL-TB-002', 2],
      ],
      deliver: 'all',
    },
    {
      key: 'seed-order-5',
      buyer: 'alice',
      items: [
        ['HH-DO-002', 1],
        ['TP-YM-002', 1],
      ],
      deliver: 'all',
    },
  ];
  for (const o of plan) {
    const buyer = users[o.buyer];
    if (await (await import('../models/index.js')).Order.exists({ buyer: buyer._id, idempotencyKey: o.key })) continue;
    for (const [sku, qty] of o.items) await cart.addItem(String(buyer._id), String(products[sku]._id), qty);
    const { order } = await orders.checkout(String(buyer._id), {
      addressId: await addr(o.buyer),
      paymentMethod: 'card',
      paymentToken: 'tok_visa',
      idempotencyKey: o.key,
      couponCode: o.coupon,
    });
    const sos = order.sellerOrders as any[];
    const toDeliver = o.deliver === 'all' ? sos : o.deliver === 'some' ? sos.slice(0, 1) : [];
    for (const so of toDeliver) {
      const seller = String(so.seller?._id ?? so.seller);
      const id = String(so._id);
      await sellerOrders.updateStatus(seller, id, { status: 'processing' });
      await sellerOrders.updateStatus(seller, id, {
        status: 'shipped',
        carrier: 'DemoExpress',
        trackingNumber: `DX${id.slice(-8).toUpperCase()}`,
      });
      await sellerOrders.updateStatus(seller, id, { status: 'delivered' });
    }
    if (o.deliver === 'some' && sos[1])
      await sellerOrders.updateStatus(String(sos[1].seller?._id ?? sos[1].seller), String(sos[1]._id), { status: 'processing' });
  }

  // Reviews (eligible via delivered orders)
  const rv: [string, string, number, string][] = [
    ['alice', 'GG-HP-001', 5, 'Fantastic noise cancellation and the battery really lasts.'],
    ['alice', 'UT-JK-001', 4, 'Great fit, fabric is a bit stiff at first.'],
    ['dave', 'GG-SP-004', 4, 'Loud and clear for its size.'],
    ['dave', 'SL-TB-002', 5, 'Sturdy tote, use it every day.'],
    ['alice', 'HH-DO-002', 5, 'Beautiful and cooks evenly.'],
    ['alice', 'TP-YM-002', 3, 'Good grip but a bit thin for my taste.'],
    ['bob', 'AP-CH-001', 5, 'Charges everything at once.'],
  ];
  for (const [buyer, sku, rating, comment] of rv) {
    try {
      await reviews.create(String(users[buyer]._id), String(products[sku]._id), { rating, comment });
    } catch {
      /* already reviewed or not eligible (e.g. order not delivered) — fine on re-run */
    }
  }

  // A pending return request for dave's tote
  const daveOrder = await (await import('../models/index.js')).Order.findOne({ buyer: users.dave._id, idempotencyKey: 'seed-order-4' });
  if (daveOrder && !(await ReturnRequest.exists({ order: daveOrder._id }))) {
    const detail: any = await orders.getBuyer(String(users.dave._id), String(daveOrder._id));
    const so = detail.sellerOrders.find((s: any) => s.items.some((i: any) => i.sku === 'SL-TB-002'));
    if (so && so.fulfillmentStatus === 'delivered') {
      const item = so.items.find((i: any) => i.sku === 'SL-TB-002');
      await returns.create(String(users.dave._id), String(daveOrder._id), {
        sellerOrderId: String(so._id),
        items: [{ itemId: String(item._id), quantity: 1 }],
        reason: 'One tote arrived with a torn seam.',
      });
    }
  }

  // Simulated payout history
  if (!(await PayoutRecord.exists({ seller: users.sofia._id }))) {
    await PayoutRecord.create({ seller: users.sofia._id, amount: 120, status: 'paid', reference: 'SIM-PAYOUT-SEED-0001' });
  }

  // Notifications
  const notes: [string, string, string, string][] = [
    ['alice', 'promo', 'Welcome to Bazaarly', 'Use code WELCOME10 for 10% off orders over $50.'],
    ['bob', 'promo', 'Welcome to Bazaarly', 'Use code WELCOME10 for 10% off orders over $50.'],
    ['sam', 'system', 'Seller tips', 'Keep stock updated to avoid cancelled orders.'],
    ['admin', 'system', 'Pending applications', 'There is a seller application awaiting review.'],
  ];
  for (const [k, type, title, message] of notes) {
    if (!(await Notification.exists({ user: users[k]._id, title })))
      await Notification.create({ user: users[k]._id, type, title, message });
  }
  log('Seed complete');
  return { users: USERS.length, shops: SHOPS.length, products: PRODUCTS.length };
}

async function Settings_ensureCoupon() {
  const s = await getSettings();
  if (!s.coupons.some((c) => c.code === 'WELCOME10')) {
    s.coupons.push({ code: 'WELCOME10', percentOff: 10, minSubtotal: 50, active: true } as any);
    await s.save();
  }
}

// CLI entry
const isMain = process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1]);
if (isMain) {
  (async () => {
    if (env.isProd) {
      console.error('Refusing to run the seed script with NODE_ENV=production.');
      process.exit(1);
    }
    const reset = process.argv.includes('--reset');
    if (reset && !env.allowSeed) {
      console.error('--reset drops the whole database. Set ALLOW_SEED=true to confirm you target a disposable database.');
      process.exit(1);
    }
    await connectDb();
    console.log(`Seeding database "${mongoose.connection.name}"...`);
    const r = await seedDatabase({ reset, log: console.log });
    console.log('Done:', r, `\nDemo password for all accounts: ${DEMO_PASSWORD}`);
    await disconnectDb();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
