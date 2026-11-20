import mongoose from 'mongoose';
import { Product, Review, SellerOrder } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPagination } from '../utils/response.js';
import { audit } from './audit.service.js';

async function refreshRating(productId: unknown) {
  const [agg] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'published' } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { $set: { ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count ?? 0 } });
}

export async function list(productId: string, q: { page: number; limit: number }) {
  const filter: Record<string, any> = { product: productId, status: 'published' };
  const [data, total] = await Promise.all([
    Review.find(filter).populate('buyer', 'name').sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Review.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

/** A buyer may review a product only after a delivered purchase. */
async function findPurchase(buyerId: string, productId: string) {
  return SellerOrder.findOne({ buyer: buyerId, fulfillmentStatus: 'delivered', 'items.product': productId }).sort({ deliveredAt: -1 });
}

export async function eligibility(buyerId: string, productId: string) {
  const [purchase, review] = await Promise.all([findPurchase(buyerId, productId), Review.findOne({ buyer: buyerId, product: productId })]);
  return { eligible: Boolean(purchase) && !review, hasPurchased: Boolean(purchase), review };
}

export async function create(buyerId: string, productId: string, input: { rating: number; comment: string; title?: string }) {
  if (!(await Product.exists({ _id: productId, deletedAt: null }))) throw ApiError.notFound('Product not found');
  const purchase = await findPurchase(buyerId, productId);
  if (!purchase) throw ApiError.forbidden('You can only review products you have purchased and received');
  try {
    const review = await Review.create({ buyer: buyerId, product: productId, order: purchase.parentOrder, ...input });
    await refreshRating(productId);
    return review;
  } catch (e: any) {
    if (e.code === 11000) throw ApiError.conflict('You have already reviewed this product');
    throw e;
  }
}

export async function update(user: { id: string; roles: string[] }, id: string, input: { rating?: number; comment?: string; title?: string; status?: 'published' | 'hidden' }) {
  const review = mongoose.isValidObjectId(id) ? await Review.findById(id) : null;
  if (!review) throw ApiError.notFound('Review not found');
  const isAdmin = user.roles.includes('admin');
  const isOwner = String(review.buyer) === user.id;
  if (!isOwner && !isAdmin) throw ApiError.forbidden();
  if (input.status && !isAdmin) throw ApiError.forbidden('Only administrators can moderate reviews');
  if (input.status) {
    review.status = input.status;
    await audit(user.id, 'review.moderate', 'Review', review._id, { status: input.status });
  }
  if (isOwner) {
    if (input.rating !== undefined) review.rating = input.rating;
    if (input.comment !== undefined) review.comment = input.comment;
    if (input.title !== undefined) review.title = input.title;
  }
  await review.save();
  await refreshRating(review.product);
  return review;
}

export async function remove(user: { id: string; roles: string[] }, id: string) {
  const review = mongoose.isValidObjectId(id) ? await Review.findById(id) : null;
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.buyer) !== user.id && !user.roles.includes('admin')) throw ApiError.forbidden();
  await review.deleteOne();
  await refreshRating(review.product);
}

export async function adminList(q: { status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = q.status ? { status: q.status } : {};
  const [data, total] = await Promise.all([
    Review.find(filter).populate('buyer', 'name').populate('product', 'name').sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Review.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}
