import type {
  AdminDashboard,
  Address,
  Cart,
  Category,
  Earnings,
  HomeData,
  Notification,
  Order,
  Paged,
  Payout,
  Product,
  ProductQuery,
  PublicSettings,
  ReturnRequest,
  Review,
  SellerApplication,
  SellerDashboard,
  SellerOrder,
  Settings,
  Shop,
  TrendPoint,
  User,
  ImageRef,
} from '../types';
import { api, unwrap, unwrapPaged } from './client';

type Params = Record<string, string | number | boolean | undefined>;
const clean = (p: Params = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));
const get = <T>(url: string, params?: Params) => unwrap<T>(api.get(url, { params: clean(params) }));
const getPaged = <T>(url: string, params?: Params): Promise<Paged<T>> => unwrapPaged<T>(api.get(url, { params: clean(params) }));

export interface Session {
  user: User;
  accessToken: string;
}
export const authApi = {
  register: (b: { name: string; email: string; password: string }) => unwrap<Session>(api.post('/auth/register', b)),
  login: (b: { email: string; password: string }) => unwrap<Session>(api.post('/auth/login', b)),
  logout: () => unwrap<null>(api.post('/auth/logout')),
  me: () => get<User>('/auth/me'),
};

export const catalogApi = {
  settings: () => get<PublicSettings>('/settings/public'),
  home: () => get<HomeData>('/home'),
  categories: () => get<Category[]>('/categories'),
  category: (id: string) => get<Category>(`/categories/${id}`),
  products: (q: ProductQuery) => getPaged<Product>('/products', q as Params),
  product: (id: string) => get<Product & { related: Product[] }>(`/products/${id}`),
  shops: (q: { page?: number; limit?: number; search?: string; seller?: string } = {}) => getPaged<Shop>('/shops', q),
  shop: (id: string) => get<Shop>(`/shops/${id}`),
  reviews: (id: string, page = 1) => getPaged<Review>(`/products/${id}/reviews`, { page, limit: 10 }),
  reviewState: (id: string) => get<{ eligible: boolean; hasPurchased: boolean; review: Review | null }>(`/products/${id}/reviews/me`),
  createReview: (id: string, b: { rating: number; title?: string; comment: string }) =>
    unwrap<Review>(api.post(`/products/${id}/reviews`, b)),
  updateReview: (id: string, b: Partial<{ rating: number; title: string; comment: string }>) =>
    unwrap<Review>(api.patch(`/reviews/${id}`, b)),
  deleteReview: (id: string) => unwrap<null>(api.delete(`/reviews/${id}`)),
};

export const userApi = {
  me: () => get<User>('/users/me'),
  update: (b: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => unwrap<User>(api.patch('/users/me', b)),
  addresses: () => get<Address[]>('/users/me/addresses'),
  addAddress: (b: Omit<Address, '_id'>) => unwrap<Address>(api.post('/users/me/addresses', b)),
  updateAddress: (id: string, b: Partial<Omit<Address, '_id'>>) => unwrap<Address>(api.patch(`/users/me/addresses/${id}`, b)),
  deleteAddress: (id: string) => unwrap<null>(api.delete(`/users/me/addresses/${id}`)),
  notifications: (page = 1) => getPaged<Notification>('/notifications', { page, limit: 20 }),
  readAllNotifications: () => unwrap<null>(api.post('/notifications/read-all')),
  readNotification: (id: string) => unwrap<Notification>(api.patch(`/notifications/${id}/read`)),
  applyToSell: (b: {
    businessName: string;
    businessDescription: string;
    contactInformation: { email: string; phone: string; address?: string };
  }) => unwrap<SellerApplication>(api.post('/seller-applications', b)),
  myApplication: () => get<SellerApplication | null>('/seller-applications/me'),
};

export const cartApi = {
  get: (coupon?: string) => get<Cart>('/cart', { coupon }),
  add: (productId: string, quantity = 1) => unwrap<Cart>(api.post('/cart/items', { productId, quantity })),
  update: (itemId: string, quantity: number) => unwrap<Cart>(api.patch(`/cart/items/${itemId}`, { quantity })),
  remove: (itemId: string) => unwrap<Cart>(api.delete(`/cart/items/${itemId}`)),
  clear: () => unwrap<null>(api.delete('/cart')),
};
export const wishlistApi = {
  get: () => get<Product[]>('/wishlist'),
  add: (productId: string) => unwrap<Product[]>(api.post('/wishlist/items', { productId })),
  remove: (productId: string) => unwrap<Product[]>(api.delete(`/wishlist/items/${productId}`)),
  moveToCart: (productId: string) => unwrap<Product[]>(api.post(`/wishlist/items/${productId}/move-to-cart`)),
};

export interface CheckoutInput {
  addressId: string;
  paymentMethod: 'card' | 'paypal' | 'cod';
  paymentToken?: string;
  couponCode?: string;
}
export const orderApi = {
  /** The idempotency key makes retries/double-clicks safe: the server returns the original order. */
  checkout: (b: CheckoutInput, idempotencyKey: string) =>
    unwrap<Order>(api.post('/orders/checkout', b, { headers: { 'Idempotency-Key': idempotencyKey } })),
  list: (page = 1, status?: string) => getPaged<Order>('/orders', { page, limit: 10, status }),
  get: (id: string) => get<Order>(`/orders/${id}`),
  cancel: (id: string, reason?: string) => unwrap<{ order: Order }>(api.post(`/orders/${id}/cancel`, { reason })),
  requestReturn: (id: string, b: { sellerOrderId: string; items: { itemId: string; quantity: number }[]; reason: string }) =>
    unwrap<ReturnRequest>(api.post(`/orders/${id}/returns`, b)),
  returns: () => get<ReturnRequest[]>('/returns'),
};

export interface ProductInput {
  shop: string;
  category: string;
  name: string;
  description: string;
  images: ImageRef[];
  price: number;
  discount: number;
  stock: number;
  sku: string;
  specifications: { key: string; value: string }[];
  status: 'draft' | 'active' | 'inactive';
}
export interface ShopInput {
  name: string;
  description?: string;
  logo?: ImageRef;
  banner?: ImageRef;
  contact?: { email?: string; phone?: string; address?: string };
  status?: 'active' | 'inactive';
}
export const sellerApi = {
  shops: () => get<Shop[]>('/seller/shops'),
  shop: (id: string) => get<Shop>(`/seller/shops/${id}`),
  createShop: (b: ShopInput) => unwrap<Shop>(api.post('/seller/shops', b)),
  updateShop: (id: string, b: Partial<ShopInput>) => unwrap<Shop>(api.patch(`/seller/shops/${id}`, b)),
  deleteShop: (id: string) => unwrap<Shop>(api.delete(`/seller/shops/${id}`)),
  products: (q: { page?: number; limit?: number; search?: string; shop?: string; status?: string; lowStock?: boolean } = {}) =>
    getPaged<Product>('/seller/products', q),
  product: (id: string) => get<Product>(`/seller/products/${id}`),
  createProduct: (b: ProductInput) => unwrap<Product>(api.post('/seller/products', b)),
  updateProduct: (id: string, b: Partial<ProductInput>) => unwrap<Product>(api.patch(`/seller/products/${id}`, b)),
  deleteProduct: (id: string) => unwrap<null>(api.delete(`/seller/products/${id}`)),
  adjustStock: (id: string, b: { adjustment?: number; set?: number; note?: string }) =>
    unwrap<Product>(api.patch(`/seller/products/${id}/stock`, b)),
  inventory: (id: string) =>
    get<{ _id: string; delta: number; stockAfter: number; reason: string; note?: string; createdAt: string }[]>(
      `/seller/products/${id}/inventory`,
    ),
  upload: async (files: File[]): Promise<ImageRef[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return unwrap<ImageRef[]>(api.post('/seller/uploads', fd));
  },
  orders: (q: { page?: number; limit?: number; status?: string; search?: string } = {}) => getPaged<SellerOrder>('/seller/orders', q),
  order: (id: string) => get<SellerOrder>(`/seller/orders/${id}`),
  updateOrderStatus: (id: string, b: { status: string; carrier?: string; trackingNumber?: string; trackingUrl?: string }) =>
    unwrap<SellerOrder>(api.patch(`/seller/orders/${id}/status`, b)),
  updateTracking: (id: string, b: { carrier: string; trackingNumber: string; trackingUrl?: string }) =>
    unwrap<SellerOrder>(api.patch(`/seller/orders/${id}/tracking`, b)),
  dashboard: () => get<SellerDashboard>('/seller/dashboard'),
  analytics: (days = 30) =>
    get<{
      days: number;
      salesTrend: TrendPoint[];
      topProducts: { _id: string; name: string; units: number; revenue: number }[];
      revenueByShop: { _id: string; name?: string; revenue: number }[];
    }>('/seller/analytics', { days }),
  earnings: (page = 1) => get<Earnings>('/seller/earnings', { page, limit: 10 }),
  payouts: (page = 1) => get<{ simulated: boolean } & Paged<Payout>>('/seller/payouts', { page, limit: 10 }),
  requestPayout: () => unwrap<Payout>(api.post('/seller/payouts')),
};

export interface AdminUserRow extends User {
  _id?: string;
}
export const adminApi = {
  dashboard: () => get<AdminDashboard>('/admin/dashboard'),
  users: (q: { page?: number; search?: string; role?: string; status?: string }) =>
    getPaged<User & { _id: string }>('/admin/users', { ...q, limit: 15 }),
  user: (id: string) => get<User & { _id: string }>(`/admin/users/${id}`),
  updateUser: (id: string, b: { status?: string; addRoles?: string[]; removeRoles?: string[] }) =>
    unwrap<User>(api.patch(`/admin/users/${id}`, b)),
  applications: (q: { page?: number; status?: string }) => getPaged<SellerApplication>('/admin/seller-applications', { ...q, limit: 15 }),
  reviewApplication: (id: string, b: { status: 'approved' | 'rejected'; reviewNotes?: string }) =>
    unwrap<SellerApplication>(api.patch(`/admin/seller-applications/${id}`, b)),
  sellers: (q: { page?: number; search?: string }) =>
    getPaged<{ id: string; name: string; email: string; roles: string[]; status: string; shops: number }>('/admin/sellers', {
      ...q,
      limit: 15,
    }),
  updateSeller: (id: string, b: { action: 'suspend' | 'reactivate'; notes?: string }) =>
    unwrap<unknown>(api.patch(`/admin/sellers/${id}`, b)),
  shops: (q: { page?: number; search?: string; status?: string; seller?: string }) => getPaged<Shop>('/admin/shops', { ...q, limit: 15 }),
  updateShop: (id: string, status: string) => unwrap<Shop>(api.patch(`/admin/shops/${id}`, { status })),
  products: (q: { page?: number; search?: string; status?: string; shop?: string; seller?: string }) =>
    getPaged<Product>('/admin/products', { ...q, limit: 15 }),
  updateProduct: (id: string, b: { status?: string; featured?: boolean }) => unwrap<Product>(api.patch(`/admin/products/${id}`, b)),
  categories: () => get<Category[]>('/admin/categories'),
  createCategory: (b: Partial<Category>) => unwrap<Category>(api.post('/admin/categories', b)),
  updateCategory: (id: string, b: Partial<Category>) => unwrap<Category>(api.patch(`/admin/categories/${id}`, b)),
  deleteCategory: (id: string) => unwrap<null>(api.delete(`/admin/categories/${id}`)),
  orders: (q: { page?: number; search?: string; status?: string }) => getPaged<Order>('/admin/orders', { ...q, limit: 15 }),
  order: (id: string) => get<Order>(`/admin/orders/${id}`),
  cancelSellerOrder: (id: string, reason?: string) => unwrap<unknown>(api.post(`/admin/seller-orders/${id}/cancel`, { reason })),
  returns: (q: { page?: number; status?: string }) => getPaged<ReturnRequest>('/admin/returns', { ...q, limit: 15 }),
  resolveReturn: (id: string, b: { status: 'approved' | 'rejected' | 'refunded'; adminNotes?: string }) =>
    unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}`, b)),
  reviews: (q: { page?: number; status?: string }) => getPaged<Review>('/admin/reviews', { ...q, limit: 15 }),
  moderateReview: (id: string, status: 'published' | 'hidden') => unwrap<Review>(api.patch(`/reviews/${id}`, { status })),
  auditLogs: () => get<unknown[]>('/admin/audit-logs'),
  settings: () => get<Settings>('/admin/settings'),
  updateSettings: (b: Partial<Settings>) => unwrap<Settings>(api.patch('/admin/settings', b)),
};
