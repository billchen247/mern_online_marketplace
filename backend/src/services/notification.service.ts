import { Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPagination } from '../utils/response.js';

export async function list(userId: string, q: { page: number; limit: number }) {
  const [data, total, unread] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Notification.countDocuments({ user: userId }),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return { data, unread, pagination: buildPagination(q.page, q.limit, total) };
}

export async function markRead(userId: string, id: string) {
  const n = await Notification.findOneAndUpdate({ _id: id, user: userId }, { $set: { read: true } }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  return n;
}

export const markAllRead = (userId: string) => Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
