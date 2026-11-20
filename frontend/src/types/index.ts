export type Role = 'user' | 'seller' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  createdAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}
export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface ImageRef {
  url: string;
  publicId?: string;
}
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentCategory?: string | null;
  status?: 'active' | 'inactive';
  image?: string;
}
export interface ShopRef {
  _id: string;
  name: string;
  slug?: string;
  logo?: ImageRef;
}
export interface Shop extends ShopRef {
  seller: string | { _id: string; name: string };
  description?: string;
  banner?: ImageRef;
  contact?: { email?: string; phone?: string; address?: string };
  categories?: string[];
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  createdAt?: string;
}
export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: ImageRef[];
  price: number;
  discount: number;
  finalPrice: number;
  stock: number;
  inStock: boolean;
  lowStockThreshold?: number;
  sku: string;
  specifications: { key: string; value: string }[];
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'blocked';
  featured?: boolean;
  ratingAverage: number;
  ratingCount: number;
  salesCount?: number;
  shop: (ShopRef & { description?: string; contact?: Shop['contact'] }) | string;
  category: Pick<Category, '_id' | 'name' | 'slug'> | string;
  seller?: { _id: string; name: string } | string;
  related?: Product[];
}

export interface CartItem {
  id: string;
  quantity: number;
  available: boolean;
  issue: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    image?: string;
    price: number;
    discount: number;
    finalPrice: number;
    stock: number;
    shop: { id: string; name: string };
  } | null;
}
export interface PriceSummary {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  couponCode?: string | null;
  itemCount: number;
  sellerCount: number;
  estimated: boolean;
}
export interface Cart {
  items: CartItem[];
  summary: PriceSummary;
  hasIssues: boolean;
}

export interface Address {
  _id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export interface OrderItem {
  _id: string;
  product: string;
  shop: string;
  seller: string;
  name: string;
  image?: string;
  sku?: string;
  shopName?: string;
  unitPrice: number;
  listPrice: number;
  quantity: number;
  lineTotal: number;
  returnedQuantity?: number;
}
export interface SellerOrder {
  _id: string;
  orderNumber: string;
  parentOrder: string;
  parentOrderNumber?: string;
  seller: string | { _id: string; name: string };
  buyer: string | { _id: string; name: string; email?: string };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  commissionRate: number;
  commission: number;
  sellerEarnings: number;
  fulfillmentStatus: FulfillmentStatus;
  cancellationRequested?: boolean;
  trackingInformation?: { carrier?: string; trackingNumber?: string; trackingUrl?: string; shippedAt?: string };
  shippingAddress?: Omit<Address, '_id'>;
  allowedTransitions?: FulfillmentStatus[];
  statusHistory?: { status: string; at: string }[];
  createdAt: string;
}
export interface Order {
  _id: string;
  orderNumber: string;
  buyer: string | { _id: string; name: string; email?: string };
  sellerOrders: SellerOrder[];
  shippingAddressSnapshot: Omit<Address, '_id'>;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  refundedAmount: number;
  createdAt: string;
  itemCount?: number;
  preview?: { name: string; image?: string }[];
}
export interface ReturnRequest {
  _id: string;
  order: string | { _id: string; orderNumber: string };
  buyer?: string | { _id: string; name: string };
  sellerOrder: string | { _id: string; orderNumber: string };
  items: { itemId: string; name: string; quantity: number }[];
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'refunded';
  refundAmount: number;
  adminNotes?: string;
  createdAt: string;
}
export interface Review {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  status: string;
  buyer?: { _id: string; name: string } | string;
  product?: { _id: string; name: string } | string;
  createdAt: string;
}
export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
export interface SellerApplication {
  _id: string;
  user?: { _id: string; name: string; email: string; roles: Role[] } | string;
  businessName: string;
  businessDescription: string;
  contactInformation: { email: string; phone: string; address?: string };
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  reviewNotes?: string;
  createdAt: string;
}
export interface PublicSettings {
  marketplaceName: string;
  tagline: string;
  primaryColor: string;
  shipping: { flatRate: number; freeShippingThreshold: number };
  tax: { rate: number };
}
export interface Settings extends PublicSettings {
  commissionRate: number;
  moderation: { requireProductApproval: boolean; requireShopApproval: boolean };
  coupons: { code: string; percentOff: number; minSubtotal: number; active: boolean; expiresAt?: string }[];
}
export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}
export interface SellerDashboard {
  totalSales: number;
  orderCount: number;
  productCount: number;
  shopCount: number;
  pendingOrders: number;
  completedOrders: number;
  lowStockProducts: { _id: string; name: string; stock: number; lowStockThreshold: number }[];
  recentOrders: SellerOrder[];
  salesTrend: TrendPoint[];
}
export interface AdminDashboard {
  totalUsers: number;
  totalSellers: number;
  totalShops: number;
  totalProducts: number;
  totalOrders: number;
  grossSales: number;
  commissions: number;
  pendingSellerApplications: number;
  pendingReturns: number;
  recentOrders: Order[];
  salesTrend: TrendPoint[];
}
export interface Earnings {
  simulated: boolean;
  grossSales: number;
  marketplaceCommission: number;
  netEarnings: number;
  pendingEarnings: number;
  completedEarnings: number;
  availableForPayout: number;
  commissionHistory: {
    _id: string;
    grossAmount: number;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
    status: string;
    createdAt: string;
    sellerOrder?: { orderNumber: string } | string;
  }[];
  pagination: Pagination;
}
export interface Payout {
  _id: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
}
export interface HomeData {
  featured: Product[];
  popular: Product[];
  newArrivals: Product[];
  recommended: Product[];
  shops: Shop[];
  categories: Category[];
}
export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  shop?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sortBy?: 'price' | 'popularity' | 'rating' | 'newest';
  order?: 'asc' | 'desc';
}
