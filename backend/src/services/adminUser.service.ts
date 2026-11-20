import mongoose from 'mongoose';
import { Address, AuditLog, Order, Product, SellerApplication, SellerOrder, Shop, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/helpers.js';
import { buildPagination } from '../utils/response.js';
import { audit } from './audit.service.js';

export async function list(q: { search?: string; role?: string; status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = {};
  if (q.role) filter.roles = q.role;
  if (q.status) filter.status = q.status;
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const [data, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function get(id: string) {
  const user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) throw ApiError.notFound('User not found');
  const [orders, shops, products, application, addresses] = await Promise.all([
    Order.countDocuments({ buyer: id }),
    Shop.countDocuments({ seller: id }),
    Product.countDocuments({ seller: id, deletedAt: null }),
    SellerApplication.findOne({ user: id }).sort({ createdAt: -1 }),
    Address.countDocuments({ user: id }),
  ]);
  const [sales] = await SellerOrder.aggregate([
    { $match: { seller: user._id, fulfillmentStatus: { $ne: 'cancelled' } } },
    { $group: { _id: null, total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
  ]);
  return {
    user,
    stats: { orders, shops, products, addresses, sellerSales: sales?.total ?? 0, sellerOrders: sales?.count ?? 0 },
    application,
  };
}

export async function update(
  adminId: string,
  id: string,
  input: { status?: 'active' | 'inactive' | 'suspended'; addRoles?: string[]; removeRoles?: string[] },
) {
  const user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) throw ApiError.notFound('User not found');
  const self = id === adminId;
  if (input.status && input.status !== 'active' && self) throw ApiError.badRequest('You cannot deactivate your own account');
  if (input.removeRoles?.includes('user')) throw ApiError.badRequest('The base "user" role cannot be removed');
  if (self && input.removeRoles?.includes('admin')) throw ApiError.badRequest('You cannot remove your own admin role');

  const roles = new Set<string>(user.roles);
  input.addRoles?.forEach((r) => roles.add(r));
  input.removeRoles?.forEach((r) => roles.delete(r));
  roles.add('user');
  if (input.removeRoles?.includes('admin') && user.roles.includes('admin')) {
    const admins = await User.countDocuments({ roles: 'admin', status: 'active' });
    if (admins <= 1) throw ApiError.badRequest('Cannot remove the last administrator');
  }
  const before = { roles: [...user.roles], status: user.status };
  user.set('roles', [...roles]);
  if (input.status) {
    user.status = input.status;
    if (input.status !== 'active') user.set('refreshTokens', []); // revoke sessions
  }
  await user.save();
  await audit(adminId, 'user.update', 'User', user._id, { before, after: { roles: user.roles, status: user.status } });
  return user;
}

export const auditLogs = (limit = 50) => AuditLog.find().populate('actor', 'name').sort({ createdAt: -1 }).limit(limit);
