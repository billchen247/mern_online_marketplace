import mongoose from 'mongoose';
import { CommissionRecord, InventoryLog, Order, Product, ReturnRequest, SellerOrder } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { calcCommission, round2 } from '../utils/pricing.js';
import { buildPagination } from '../utils/response.js';
import { audit, notify } from './audit.service.js';
import { recomputeParent } from './order.service.js';

export async function create(
  buyerId: string,
  orderId: string,
  input: { sellerOrderId: string; items: { itemId: string; quantity: number }[]; reason: string },
) {
  const order = mongoose.isValidObjectId(orderId) ? await Order.findOne({ _id: orderId, buyer: buyerId }) : null;
  if (!order) throw ApiError.notFound('Order not found');
  const so = await SellerOrder.findOne({ _id: input.sellerOrderId, parentOrder: order._id });
  if (!so) throw ApiError.notFound('Seller order not found in this order');
  if (so.fulfillmentStatus !== 'delivered') throw ApiError.conflict('Returns can only be requested for delivered items', 'NOT_DELIVERED');
  const open = await ReturnRequest.find({ sellerOrder: so._id, status: { $in: ['requested', 'approved'] } });
  const pending = new Map<string, number>();
  for (const r of open) for (const i of r.items) pending.set(String(i.itemId), (pending.get(String(i.itemId)) ?? 0) + i.quantity);

  const items = input.items.map((req) => {
    const item = so.items.id(req.itemId);
    if (!item) throw ApiError.badRequest('Item does not belong to this seller order');
    const available = item.quantity - item.returnedQuantity - (pending.get(String(item._id)) ?? 0);
    if (req.quantity > available) throw ApiError.badRequest(`Only ${available} unit(s) of "${item.name}" can still be returned`);
    return { itemId: item._id, product: item.product, name: item.name, quantity: req.quantity };
  });
  const rr = await ReturnRequest.create({ buyer: buyerId, order: order._id, sellerOrder: so._id, items, reason: input.reason });
  await notify(
    so.seller,
    'return_request',
    'Return requested',
    `A return was requested for ${so.orderNumber}.`,
    `/seller/orders/${so._id}`,
  );
  return rr;
}

export async function listBuyer(buyerId: string) {
  return ReturnRequest.find({ buyer: buyerId })
    .populate('order', 'orderNumber')
    .populate('sellerOrder', 'orderNumber')
    .sort({ createdAt: -1 });
}

export async function adminList(q: { status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = q.status ? { status: q.status } : {};
  const [data, total] = await Promise.all([
    ReturnRequest.find(filter)
      .populate('buyer', 'name email')
      .populate('order', 'orderNumber')
      .populate('sellerOrder', 'orderNumber total')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    ReturnRequest.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

const NEXT: Record<string, string[]> = {
  requested: ['approved', 'rejected', 'refunded'],
  approved: ['refunded', 'rejected'],
  rejected: [],
  refunded: [],
};

/** Admin resolves a return; `refunded` performs the simulated refund, restocks items and adjusts commission. */
export async function adminResolve(
  adminId: string,
  id: string,
  input: { status: 'approved' | 'rejected' | 'refunded'; adminNotes?: string },
) {
  const rr = mongoose.isValidObjectId(id) ? await ReturnRequest.findById(id) : null;
  if (!rr) throw ApiError.notFound('Return request not found');
  if (!NEXT[rr.status]!.includes(input.status))
    throw ApiError.conflict(`Cannot move return from ${rr.status} to ${input.status}`, 'INVALID_TRANSITION');
  // Compare-and-set so a return can only be refunded once.
  const claimed = await ReturnRequest.updateOne(
    { _id: rr._id, status: rr.status },
    { $set: { status: input.status, adminNotes: input.adminNotes, resolvedBy: adminId } },
  );
  if (claimed.modifiedCount !== 1) throw ApiError.conflict('Return was updated concurrently');

  if (input.status === 'refunded') {
    const so = (await SellerOrder.findById(rr.sellerOrder))!;
    let amount = 0;
    for (const ri of rr.items) {
      const item = so.items.id(ri.itemId)!;
      amount += item.unitPrice * ri.quantity;
      item.returnedQuantity += ri.quantity;
      await Product.updateOne({ _id: item.product }, { $inc: { stock: ri.quantity } });
      await InventoryLog.create({
        product: item.product,
        seller: item.seller,
        change: ri.quantity,
        reason: 'return',
        order: rr.order,
        actor: adminId,
      });
    }
    amount = round2(Math.min(amount, so.total - so.refundedAmount));
    so.refundedAmount = round2(so.refundedAmount + amount);
    await so.save();
    await ReturnRequest.updateOne({ _id: rr._id }, { $set: { refundAmount: amount } });
    const rec = await CommissionRecord.findOne({ sellerOrder: so._id });
    if (rec) {
      const gross = Math.max(round2(rec.grossAmount - amount), 0);
      const { commission, net } = calcCommission(gross, rec.commissionRate);
      rec.grossAmount = gross;
      rec.commissionAmount = commission;
      rec.netAmount = net;
      if (gross === 0) rec.status = 'refunded';
      await rec.save();
    }
    await recomputeParent(rr.order);
  }
  await audit(adminId, `return.${input.status}`, 'ReturnRequest', rr._id, { notes: input.adminNotes });
  await notify(
    rr.buyer,
    'return_update',
    `Return ${input.status}`,
    input.adminNotes ?? `Your return request was ${input.status}.`,
    `/account/returns`,
  );
  return ReturnRequest.findById(id);
}
