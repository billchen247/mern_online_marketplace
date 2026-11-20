import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const BASE = 'http://localhost:5000/api/v1';
export const ok = (data: unknown, message = 'ok') => HttpResponse.json({ success: true, message, data });
export const paged = (items: unknown[], page = 1, limit = 10) =>
  HttpResponse.json({
    success: true,
    message: 'ok',
    data: items,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
      hasNext: false,
      hasPrev: false,
    },
  });
export const fail = (status: number, message: string) => HttpResponse.json({ success: false, message }, { status });

export const users = {
  buyer: { id: 'u1', name: 'Alice Buyer', email: 'alice@example.com', roles: ['user'], status: 'active' },
  seller: { id: 'u2', name: 'Sam Seller', email: 'sam@example.com', roles: ['user', 'seller'], status: 'active' },
  admin: { id: 'u3', name: 'Ada Admin', email: 'admin@example.com', roles: ['user', 'admin'], status: 'active' },
};
export type Persona = keyof typeof users;

/** Mutable "who is logged in" used by the refresh/me handlers. */
const session: { user: (typeof users)[Persona] | null } = { user: null };
export const loginAs = (p: Persona | null) => {
  session.user = p ? users[p] : null;
};
export const resetSession = () => {
  session.user = null;
};

export const category = { _id: 'c1', name: 'Electronics', slug: 'electronics', status: 'active' };
export const shopRef = { _id: 's1', name: 'Gadget Shop', slug: 'gadget-shop' };
export const product = {
  _id: 'p1',
  name: 'Gaming Laptop',
  slug: 'gaming-laptop',
  description: 'A powerful laptop for gaming and work.',
  images: [{ url: 'https://img.test/1.jpg' }],
  price: 1000,
  discount: 10,
  finalPrice: 900,
  stock: 8,
  inStock: true,
  lowStockThreshold: 5,
  sku: 'LP-1',
  specifications: [{ key: 'RAM', value: '16GB' }],
  category,
  shop: shopRef,
  seller: 'u2',
  status: 'active',
  ratingAverage: 4.5,
  ratingCount: 3,
  salesCount: 10,
  featured: false,
  createdAt: '2026-01-01T00:00:00Z',
};
export const product2 = {
  ...product,
  _id: 'p2',
  name: 'Office Mouse',
  slug: 'office-mouse',
  price: 20,
  discount: 0,
  finalPrice: 20,
  stock: 2,
  sku: 'MS-1',
};
export const shop = {
  ...shopRef,
  seller: { _id: 'u2', name: 'Sam Seller' },
  description: 'Great gadgets',
  status: 'active',
  contact: { email: 's@x.com' },
  createdAt: '2026-01-01T00:00:00Z',
};
export const address = {
  _id: 'a1',
  recipientName: 'Alice',
  phone: '+1 555 0100',
  addressLine1: '1 Main St',
  city: 'Toronto',
  state: 'ON',
  postalCode: 'M5V 1A1',
  country: 'Canada',
  isDefault: true,
};
export const cartItem = {
  id: 'ci1',
  quantity: 2,
  product: {
    id: 'p1',
    name: 'Gaming Laptop',
    slug: 'gaming-laptop',
    image: 'https://img.test/1.jpg',
    price: 1000,
    discount: 10,
    finalPrice: 900,
    stock: 8,
    shop: { id: 's1', name: 'Gadget Shop' },
  },
  available: true,
  issue: null,
};
export const cart = {
  items: [cartItem],
  hasIssues: false,
  summary: { itemCount: 2, subtotal: 1800, discount: 0, shipping: 0, tax: 180, total: 1980, couponCode: null, couponApplied: false },
};
export const sellerOrder = {
  _id: 'so1',
  orderNumber: 'MP-ABC-1',
  parentOrderNumber: 'MP-ABC',
  parentOrder: 'o1',
  seller: { _id: 'u2', name: 'Sam Seller' },
  buyer: { _id: 'u1', name: 'Alice Buyer', email: 'alice@example.com' },
  items: [
    {
      _id: 'i1',
      product: 'p1',
      name: 'Gaming Laptop',
      sku: 'LP-1',
      image: 'https://img.test/1.jpg',
      shopName: 'Gadget Shop',
      quantity: 2,
      unitPrice: 900,
      lineTotal: 1800,
    },
  ],
  subtotal: 1800,
  shippingFee: 0,
  tax: 180,
  commission: 180,
  commissionRate: 10,
  sellerEarnings: 1620,
  fulfillmentStatus: 'pending',
  allowedTransitions: ['processing', 'cancelled'],
  statusHistory: [],
  shippingAddress: address,
  createdAt: '2026-01-02T00:00:00Z',
  cancellationRequested: false,
};
export const order = {
  _id: 'o1',
  orderNumber: 'MP-ABC',
  buyer: { _id: 'u1', name: 'Alice Buyer' },
  sellerOrders: [sellerOrder],
  shippingAddressSnapshot: address,
  subtotal: 1800,
  shippingFee: 0,
  tax: 180,
  discount: 0,
  total: 1980,
  paymentMethod: 'card',
  paymentStatus: 'paid',
  orderStatus: 'paid',
  refundedAmount: 0,
  createdAt: '2026-01-02T00:00:00Z',
  itemCount: 2,
  preview: [{ name: 'Gaming Laptop' }],
};
export const settings = {
  marketplaceName: 'Bazaarly',
  tagline: 'Shop everything',
  primaryColor: '#4f46e5',
  shipping: { flatRate: 5, freeShippingThreshold: 100 },
  tax: { rate: 10 },
  commissionRate: 10,
  moderation: { requireProductApproval: false, requireShopApproval: false },
  coupons: [],
};
const trend = [
  { date: '2026-01-01', revenue: 100, orders: 2 },
  { date: '2026-01-02', revenue: 200, orders: 3 },
];
export const earnings = {
  simulated: true,
  grossSales: 1800,
  marketplaceCommission: 180,
  netEarnings: 1620,
  pendingEarnings: 0,
  completedEarnings: 1620,
  availableForPayout: 1620,
  commissionHistory: [
    {
      _id: 'cr1',
      sellerOrder: { _id: 'so1', orderNumber: 'MP-ABC-1' },
      grossAmount: 1800,
      commissionRate: 10,
      commissionAmount: 180,
      netAmount: 1620,
      status: 'completed',
      createdAt: '2026-01-02T00:00:00Z',
    },
  ],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
};

export const handlers = [
  http.post(`${BASE}/auth/refresh`, () => (session.user ? ok({ accessToken: 'tok' }) : fail(401, 'No session'))),
  http.get(`${BASE}/auth/me`, () => ok(session.user)),
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const b = (await request.json()) as { email: string; password: string };
    const u = Object.values(users).find((x) => x.email === b.email);
    if (!u || b.password !== 'Password123') return fail(401, 'Invalid email or password');
    session.user = u;
    return ok({ user: u, accessToken: 'tok' });
  }),
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const b = (await request.json()) as { name: string; email: string };
    session.user = { ...users.buyer, name: b.name, email: b.email };
    return ok({ user: session.user, accessToken: 'tok' });
  }),
  http.post(`${BASE}/auth/logout`, () => {
    session.user = null;
    return ok(null);
  }),
  http.get(`${BASE}/settings/public`, () => ok(settings)),
  http.get(`${BASE}/home`, () =>
    ok({
      featured: [product],
      popular: [product],
      newArrivals: [product2],
      recommended: [product2],
      categories: [category],
      shops: [shop],
    }),
  ),
  http.get(`${BASE}/categories`, () => ok([category])),
  http.get(`${BASE}/categories/:id`, () => ok(category)),
  http.get(`${BASE}/products`, ({ request }) => {
    const s = new URL(request.url).searchParams.get('search');
    return paged(s && !/laptop/i.test(s) ? [] : [product, product2]);
  }),
  http.get(`${BASE}/products/:id`, () => ok({ ...product, related: [product2] })),
  http.get(`${BASE}/products/:id/reviews`, () =>
    paged([
      {
        _id: 'r1',
        rating: 5,
        title: 'Great',
        comment: 'Loved it',
        status: 'published',
        buyer: { _id: 'u1', name: 'Alice' },
        createdAt: '2026-01-03T00:00:00Z',
      },
    ]),
  ),
  http.get(`${BASE}/products/:id/reviews/me`, () => ok({ eligible: false, hasPurchased: false, review: null })),
  http.get(`${BASE}/shops`, () => paged([shop])),
  http.get(`${BASE}/shops/:id`, () => ok(shop)),
  http.get(`${BASE}/cart`, () => ok(cart)),
  http.post(`${BASE}/cart/items`, () => ok(cart)),
  http.patch(`${BASE}/cart/items/:id`, () => ok(cart)),
  http.delete(`${BASE}/cart/items/:id`, () => ok(cart)),
  http.delete(`${BASE}/cart`, () => ok({ ...cart, items: [], summary: { ...cart.summary, itemCount: 0 } })),
  http.get(`${BASE}/wishlist`, () => ok([product])),
  http.post(`${BASE}/wishlist/items`, () => ok([product])),
  http.delete(`${BASE}/wishlist/items/:id`, () => ok([])),
  http.post(`${BASE}/wishlist/items/:id/move-to-cart`, () => ok([])),
  http.get(`${BASE}/users/me/addresses`, () => ok([address])),
  http.post(`${BASE}/users/me/addresses`, () => ok(address)),
  http.patch(`${BASE}/users/me/addresses/:id`, () => ok(address)),
  http.delete(`${BASE}/users/me/addresses/:id`, () => ok(null)),
  http.get(`${BASE}/users/me`, () => ok(session.user)),
  http.patch(`${BASE}/users/me`, () => ok(session.user)),
  http.get(`${BASE}/notifications`, () =>
    paged([
      { _id: 'n1', type: 'order', title: 'Order shipped', message: 'Your order shipped', read: false, createdAt: '2026-01-03T00:00:00Z' },
    ]),
  ),
  http.post(`${BASE}/notifications/read-all`, () => ok(null)),
  http.patch(`${BASE}/notifications/:id/read`, () => ok(null)),
  http.get(`${BASE}/seller-applications/me`, () => ok(null)),
  http.post(`${BASE}/seller-applications`, () => ok({ _id: 'app1', businessName: 'Biz', applicationStatus: 'pending' })),
  http.get(`${BASE}/orders`, () => paged([order])),
  http.get(`${BASE}/orders/:id`, () => ok(order)),
  http.post(`${BASE}/orders/checkout`, () => HttpResponse.json({ success: true, message: 'ok', data: order }, { status: 201 })),
  http.post(`${BASE}/orders/:id/cancel`, () => ok(order)),
  http.post(`${BASE}/orders/:id/returns`, () => ok({ _id: 'rt1' })),
  http.get(`${BASE}/returns`, () => ok([])),
  // seller
  http.get(`${BASE}/seller/dashboard`, () =>
    ok({
      totalSales: 1800,
      orderCount: 3,
      productCount: 2,
      shopCount: 1,
      pendingOrders: 1,
      completedOrders: 2,
      lowStockProducts: [{ _id: 'p2', name: 'Office Mouse', stock: 2, lowStockThreshold: 5 }],
      recentOrders: [sellerOrder],
      salesTrend: trend,
    }),
  ),
  http.get(`${BASE}/seller/shops`, () => ok([shop])),
  http.get(`${BASE}/seller/shops/:id`, () => ok(shop)),
  http.post(`${BASE}/seller/shops`, () => ok(shop)),
  http.patch(`${BASE}/seller/shops/:id`, () => ok(shop)),
  http.delete(`${BASE}/seller/shops/:id`, () => ok(null)),
  http.get(`${BASE}/seller/products`, () => paged([product, product2])),
  http.get(`${BASE}/seller/products/:id`, () => ok(product)),
  http.post(`${BASE}/seller/products`, () => ok(product)),
  http.patch(`${BASE}/seller/products/:id`, () => ok(product)),
  http.delete(`${BASE}/seller/products/:id`, () => ok(null)),
  http.patch(`${BASE}/seller/products/:id/stock`, () => ok(product)),
  http.get(`${BASE}/seller/products/:id/inventory`, () =>
    ok([{ _id: 'h1', delta: 5, stockAfter: 8, reason: 'adjustment', note: 'restock', createdAt: '2026-01-02T00:00:00Z' }]),
  ),
  http.get(`${BASE}/seller/orders`, () => paged([sellerOrder])),
  http.get(`${BASE}/seller/orders/:id`, () => ok(sellerOrder)),
  http.patch(`${BASE}/seller/orders/:id/status`, () => ok(sellerOrder)),
  http.patch(`${BASE}/seller/orders/:id/tracking`, () => ok(sellerOrder)),
  http.get(`${BASE}/seller/earnings`, () => ok(earnings)),
  http.get(`${BASE}/seller/payouts`, () =>
    ok({
      simulated: true,
      data: [{ _id: 'po1', reference: 'PO-1', amount: 100, status: 'paid', createdAt: '2026-01-04T00:00:00Z' }],
      pagination: earnings.pagination,
    }),
  ),
  http.post(`${BASE}/seller/payouts`, () => ok({ _id: 'po2' })),
  // admin
  http.get(`${BASE}/admin/dashboard`, () =>
    ok({
      totalUsers: 10,
      totalSellers: 3,
      totalShops: 4,
      totalProducts: 20,
      totalOrders: 5,
      grossSales: 5000,
      commissions: 500,
      pendingSellerApplications: 1,
      pendingReturns: 0,
      recentOrders: [order],
      salesTrend: trend,
    }),
  ),
  http.get(`${BASE}/admin/users`, () =>
    paged([
      { ...users.buyer, _id: 'u1' },
      { ...users.admin, _id: 'u3' },
      { ...users.seller, _id: 'u2' },
      { ...users.buyer, _id: 'u4', name: 'Sue Suspended', email: 'sue@example.com', status: 'suspended' },
    ]),
  ),
  http.patch(`${BASE}/admin/users/:id`, () => ok(users.buyer)),
  http.get(`${BASE}/admin/seller-applications`, () =>
    paged([
      {
        _id: 'app2',
        user: { _id: 'u5', name: 'Old Applicant', email: 'o@x.com', roles: ['user'] },
        businessName: 'Old Biz',
        businessDescription: 'Rejected',
        contactInformation: { email: 'o@x.com', phone: '1' },
        applicationStatus: 'rejected',
        reviewNotes: 'no',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        _id: 'app1',
        user: { _id: 'u1', name: 'Alice', email: 'a@x.com', roles: ['user'] },
        businessName: 'Alice Biz',
        businessDescription: 'Selling things',
        contactInformation: { email: 'a@x.com', phone: '12345' },
        applicationStatus: 'pending',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]),
  ),
  http.patch(`${BASE}/admin/seller-applications/:id`, () => ok({})),
  http.get(`${BASE}/admin/sellers`, () =>
    paged([
      { id: 'u9', name: 'Susp Seller', email: 'x@x.com', roles: ['user', 'seller'], status: 'suspended', shops: 1 },
      { id: 'u2', name: 'Sam Seller', email: 'sam@example.com', roles: ['user', 'seller'], status: 'active', shops: 2 },
    ]),
  ),
  http.patch(`${BASE}/admin/sellers/:id`, () => ok({})),
  http.get(`${BASE}/admin/shops`, () =>
    paged([
      shop,
      { ...shop, _id: 's2', name: 'Pending Shop', slug: 'pending', status: 'pending' },
      { ...shop, _id: 's3', name: 'Suspended Shop', slug: 'susp', status: 'suspended' },
    ]),
  ),
  http.patch(`${BASE}/admin/shops/:id`, () => ok(shop)),
  http.get(`${BASE}/admin/products`, () =>
    paged([
      product,
      { ...product2, status: 'draft', featured: true },
      { ...product, _id: 'p3', name: 'Inactive Thing', status: 'inactive' },
    ]),
  ),
  http.patch(`${BASE}/admin/products/:id`, () => ok(product)),
  http.get(`${BASE}/admin/categories`, () => ok([category, { ...category, _id: 'c2', name: 'Fashion', slug: 'fashion' }])),
  http.post(`${BASE}/admin/categories`, () => ok(category)),
  http.patch(`${BASE}/admin/categories/:id`, () => ok(category)),
  http.delete(`${BASE}/admin/categories/:id`, () => ok(null)),
  http.get(`${BASE}/admin/orders`, () =>
    paged([
      order,
      { ...order, _id: 'o2', orderNumber: 'MP-DEF', orderStatus: 'pending', paymentStatus: 'pending' },
      { ...order, _id: 'o3', orderNumber: 'MP-GHI', orderStatus: 'cancelled', paymentStatus: 'refunded' },
    ]),
  ),
  http.get(`${BASE}/admin/orders/:id`, () => ok(order)),
  http.post(`${BASE}/admin/seller-orders/:id/cancel`, () => ok({})),
  http.get(`${BASE}/admin/returns`, () =>
    paged([
      {
        _id: 'rt2',
        order: { _id: 'o2', orderNumber: 'MP-DEF' },
        buyer: { _id: 'u1', name: 'Alice' },
        sellerOrder: 'so1',
        items: [{ itemId: 'i1', name: 'Mouse', quantity: 1 }],
        reason: 'Wrong item',
        status: 'approved',
        refundAmount: 20,
        createdAt: '2026-01-05T00:00:00Z',
      },
      {
        _id: 'rt1',
        order: { _id: 'o1', orderNumber: 'MP-ABC' },
        buyer: { _id: 'u1', name: 'Alice' },
        sellerOrder: 'so1',
        items: [{ itemId: 'i1', name: 'Gaming Laptop', quantity: 1 }],
        reason: 'Damaged on arrival',
        status: 'requested',
        refundAmount: 900,
        createdAt: '2026-01-05T00:00:00Z',
      },
    ]),
  ),
  http.patch(`${BASE}/admin/returns/:id`, () => ok({})),
  http.get(`${BASE}/admin/reviews`, () =>
    paged([
      {
        _id: 'r2',
        rating: 1,
        title: 'Bad',
        comment: 'Hidden one',
        status: 'hidden',
        buyer: { _id: 'u1', name: 'Alice' },
        product: { _id: 'p1', name: 'Gaming Laptop' },
        createdAt: '2026-01-03T00:00:00Z',
      },
      {
        _id: 'r1',
        rating: 4,
        title: 'Nice',
        comment: 'Good product',
        status: 'published',
        buyer: { _id: 'u1', name: 'Alice' },
        product: { _id: 'p1', name: 'Gaming Laptop' },
        createdAt: '2026-01-03T00:00:00Z',
      },
    ]),
  ),
  http.patch(`${BASE}/reviews/:id`, () => ok({})),
  http.get(`${BASE}/admin/settings`, () => ok(settings)),
  http.patch(`${BASE}/admin/settings`, () => ok(settings)),
];

export const server = setupServer(...handlers);
