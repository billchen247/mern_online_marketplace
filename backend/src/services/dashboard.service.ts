import mongoose from 'mongoose';
import {
  CommissionRecord,
  Order,
  PayoutRecord,
  Product,
  ReturnRequest,
  SellerApplication,
  SellerOrder,
  Shop,
  User,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { round2 } from '../utils/pricing.js';
import { buildPagination } from '../utils/response.js';

const oid = (id: string) => new mongoose.Types.ObjectId(id);

async function trend(model: any, match: Record<string, any>, field: string, days: number) {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: `$${field}` }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(rows.map((r: any) => [r._id, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const r: any = map.get(d);
    out.push({ date: d, revenue: round2(r?.revenue ?? 0), orders: r?.orders ?? 0 });
  }
  return out;
}

export async function sellerDashboard(sellerId: string) {
  const seller = oid(sellerId);
  const [totals] = await SellerOrder.aggregate([
    { $match: { seller, fulfillmentStatus: { $ne: 'cancelled' } } },
    { $group: { _id: null, sales: { $sum: { $subtract: ['$subtotal', '$discount'] } }, orders: { $sum: 1 } } },
  ]);
  const [shops, products, pending, completed, lowStock, recent] = await Promise.all([
    Shop.countDocuments({ seller: sellerId }),
    Product.countDocuments({ seller: sellerId, deletedAt: null }),
    SellerOrder.countDocuments({ seller: sellerId, fulfillmentStatus: { $in: ['pending', 'processing'] } }),
    SellerOrder.countDocuments({ seller: sellerId, fulfillmentStatus: 'delivered' }),
    Product.find({ seller: sellerId, deletedAt: null, status: { $ne: 'blocked' }, $expr: { $lte: ['$stock', '$lowStockThreshold'] } })
      .select('name stock lowStockThreshold images')
      .limit(10),
    SellerOrder.find({ seller: sellerId }).populate('buyer', 'name').sort({ createdAt: -1 }).limit(5),
  ]);
  return {
    totalSales: round2(totals?.sales ?? 0),
    orderCount: totals?.orders ?? 0,
    productCount: products,
    shopCount: shops,
    pendingOrders: pending,
    completedOrders: completed,
    lowStockProducts: lowStock,
    recentOrders: recent,
    salesTrend: await trend(SellerOrder, { seller, fulfillmentStatus: { $ne: 'cancelled' } }, 'subtotal', 14),
  };
}

export async function sellerAnalytics(sellerId: string, days: number) {
  const seller = oid(sellerId);
  const since = new Date(Date.now() - days * 86400_000);
  const topProducts = await SellerOrder.aggregate([
    { $match: { seller, fulfillmentStatus: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
  ]);
  const byShop = await SellerOrder.aggregate([
    { $match: { seller, fulfillmentStatus: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.shop', shopName: { $first: '$items.shopName' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { revenue: -1 } },
  ]);
  return {
    days,
    salesTrend: await trend(SellerOrder, { seller, fulfillmentStatus: { $ne: 'cancelled' } }, 'subtotal', days),
    topProducts,
    revenueByShop: byShop,
  };
}

export async function sellerEarnings(sellerId: string, q: { page: number; limit: number }) {
  const seller = oid(sellerId);
  const rows = await CommissionRecord.aggregate([
    { $match: { seller } },
    { $group: { _id: '$status', gross: { $sum: '$grossAmount' }, commission: { $sum: '$commissionAmount' }, net: { $sum: '$netAmount' } } },
  ]);
  const get = (s: string, f: string) => rows.find((r) => r._id === s)?.[f] ?? 0;
  const live = ['pending', 'completed'];
  const sum = (f: string) => live.reduce((a, s) => a + get(s, f), 0);
  const payouts = await PayoutRecord.aggregate([
    { $match: { seller, status: { $in: ['pending', 'paid'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const paidOut = payouts[0]?.total ?? 0;
  const [history, total] = await Promise.all([
    CommissionRecord.find({ seller })
      .populate('sellerOrder', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    CommissionRecord.countDocuments({ seller }),
  ]);
  return {
    simulated: true,
    grossSales: round2(sum('gross')),
    marketplaceCommission: round2(sum('commission')),
    netEarnings: round2(sum('net')),
    pendingEarnings: round2(get('pending', 'net')),
    completedEarnings: round2(get('completed', 'net')),
    availableForPayout: round2(get('completed', 'net') - paidOut),
    commissionHistory: history,
    pagination: buildPagination(q.page, q.limit, total),
  };
}

export async function sellerPayouts(sellerId: string, q: { page: number; limit: number }) {
  const [data, total] = await Promise.all([
    PayoutRecord.find({ seller: sellerId })
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    PayoutRecord.countDocuments({ seller: sellerId }),
  ]);
  return { simulated: true, data, pagination: buildPagination(q.page, q.limit, total) };
}

/** Simulated payout: pays out all completed-but-unpaid earnings. */
export async function requestPayout(sellerId: string) {
  const e = await sellerEarnings(sellerId, { page: 1, limit: 1 });
  if (e.availableForPayout <= 0) throw ApiError.badRequest('No completed earnings available for payout');
  return PayoutRecord.create({
    seller: sellerId,
    amount: e.availableForPayout,
    status: 'paid',
    reference: `SIM-PAYOUT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
  });
}

export async function adminDashboard() {
  const [users, sellers, shops, products, orders, pendingApps, pendingReturns, recent] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: 'seller' }),
    Shop.countDocuments(),
    Product.countDocuments({ deletedAt: null }),
    Order.countDocuments(),
    SellerApplication.countDocuments({ applicationStatus: 'pending' }),
    ReturnRequest.countDocuments({ status: 'requested' }),
    Order.find().populate('buyer', 'name').sort({ createdAt: -1 }).limit(5),
  ]);
  const [gross] = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  const [comm] = await CommissionRecord.aggregate([
    { $match: { status: { $in: ['pending', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
  ]);
  return {
    totalUsers: users,
    totalSellers: sellers,
    totalShops: shops,
    totalProducts: products,
    totalOrders: orders,
    grossSales: round2(gross?.total ?? 0),
    commissions: round2(comm?.total ?? 0),
    pendingSellerApplications: pendingApps,
    pendingReturns,
    recentOrders: recent,
    salesTrend: await trend(Order, { orderStatus: { $ne: 'cancelled' } }, 'total', 14),
  };
}
