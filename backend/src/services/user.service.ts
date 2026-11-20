import { Address, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { compact } from '../utils/helpers.js';
import { hashPassword, publicUser, verifyPassword } from './auth.service.js';

export async function getProfile(userId: string) {
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found');
  return publicUser(u);
}

export async function updateProfile(userId: string, input: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
  const u = await User.findById(userId).select('+passwordHash');
  if (!u) throw ApiError.notFound('User not found');
  if (input.newPassword) {
    if (!input.currentPassword || !(await verifyPassword(input.currentPassword, u.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    u.passwordHash = await hashPassword(input.newPassword);
    u.set('refreshTokens', []);
  }
  Object.assign(u, compact({ name: input.name, phone: input.phone }));
  await u.save();
  return publicUser(u);
}

export const listAddresses = (userId: string) => Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

export async function createAddress(userId: string, input: Record<string, any>) {
  const count = await Address.countDocuments({ user: userId });
  const isDefault = count === 0 ? true : Boolean(input.isDefault);
  if (isDefault) await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  return Address.create({ ...input, user: userId, isDefault });
}

export async function updateAddress(userId: string, id: string, input: Record<string, any>) {
  const addr = await Address.findOne({ _id: id, user: userId });
  if (!addr) throw ApiError.notFound('Address not found');
  if (input.isDefault) await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  addr.set(compact(input));
  await addr.save();
  return addr;
}

export async function deleteAddress(userId: string, id: string) {
  const addr = await Address.findOneAndDelete({ _id: id, user: userId });
  if (!addr) throw ApiError.notFound('Address not found');
  if (addr.isDefault) {
    const next = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
  }
}
