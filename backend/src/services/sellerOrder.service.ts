import mongoose from 'mongoose';
import { CommissionRecord, Order, SellerOrder } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { type FulfillmentStatus, allowedTransitions, canTransition } from '../utils/orderStatus.js';
import { buildPagination } from '../utils/response.js';
import { notify } from './audit.service.js';
import { cancelSellerOrder, recomputeParent } from './order.service.js';

async function ownOrder(sellerId: string, id: string) {
  // The seller filter is part of the query: another seller's order is indistinguishable from a missing one.
  const so = mongoose.isValidObjectId(id) ? await SellerOrder.findOne({ _id: id, seller: sellerId }) : null;
  if (!so) throw ApiError.notFound('Order not found');
  return so;
}

export async function list(sellerId: string, q: { status?: string; search?: string; page: number; limit: number }) {
  const filter: Record<string, any> = { seller: sellerId };
  if (q.status) filter.fulfillmentStatus = q.status;
  if (q.search) filter.orderNumber = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [data, total] = await Promise.all([
    SellerOrder.find(filter)
      .populate('buyer', 'name')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    SellerOrder.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function get(sellerId: string, id: string) {
  const so = await ownOrder(sellerId, id);
  const parent = await Order.findById(so.parentOrder).select('orderNumber shippingAddressSnapshot createdAt paymentStatus');
  await so.populate('buyer', 'name email');
  return {
    ...so.toObject(),
    shippingAddress: parent?.shippingAddressSnapshot,
    parentOrderNumber: parent?.orderNumber,
    allowedTransitions: allowedTransitions(so.fulfillmentStatus as FulfillmentStatus),
  };
}

export async function updateStatus(
  sellerId: string,
  id: string,
  input: { status: FulfillmentStatus; carrier?: string; trackingNumber?: string; trackingUrl?: string },
) {
  const so = await ownOrder(sellerId, id);
  const from = so.fulfillmentStatus as FulfillmentStatus;
  if (!canTransition(from, input.status)) {
    throw ApiError.conflict(`Invalid status transition: ${from} → ${input.status}`, 'INVALID_TRANSITION');
  }
  if (input.status === 'cancelled') {
    await cancelSellerOrder(so, 'Cancelled by seller');
    return SellerOrder.findById(id);
  }
  const set: Record<string, unknown> = { fulfillmentStatus: input.status };
  if (input.status === 'shipped') {
    const carrier = input.carrier ?? so.trackingInformation?.carrier;
    const trackingNumber = input.trackingNumber ?? so.trackingInformation?.trackingNumber;
    if (!carrier || !trackingNumber) throw ApiError.badRequest('Carrier and tracking number are required to mark an order as shipped');
    set['trackingInformation'] = {
      carrier,
      trackingNumber,
      trackingUrl: input.trackingUrl ?? so.trackingInformation?.trackingUrl,
      shippedAt: new Date(),
    };
  }
  if (input.status === 'delivered') set['deliveredAt'] = new Date();
  // Compare-and-set on the previous status guards against concurrent transitions.
  const res = await SellerOrder.updateOne(
    { _id: so._id, fulfillmentStatus: from },
    { $set: set, $push: { statusHistory: { status: input.status, at: new Date() } } },
  );
  if (res.modifiedCount !== 1) throw ApiError.conflict('Order status changed concurrently, please retry');
  if (input.status === 'delivered')
    await CommissionRecord.updateOne({ sellerOrder: so._id, status: 'pending' }, { $set: { status: 'completed' } });
  await recomputeParent(so.parentOrder);
  await notify(
    so.buyer,
    'order_update',
    `Order ${input.status}`,
    `Seller order ${so.orderNumber} is now ${input.status}.`,
    `/account/orders/${so.parentOrder}`,
  );
  return SellerOrder.findById(id);
}

export async function updateTracking(
  sellerId: string,
  id: string,
  input: { carrier: string; trackingNumber: string; trackingUrl?: string },
) {
  const so = await ownOrder(sellerId, id);
  if (!['processing', 'shipped'].includes(so.fulfillmentStatus)) {
    throw ApiError.conflict('Tracking can only be set while an order is processing or shipped');
  }
  so.trackingInformation = { ...(so.trackingInformation ?? {}), ...input } as any;
  await so.save();
  return so;
}
