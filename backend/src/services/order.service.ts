import mongoose from 'mongoose';
import { supportsTransactions } from '../config/db.js';
import { Address, Cart, CommissionRecord, InventoryLog, Order, Product, SellerOrder } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { type FulfillmentStatus, deriveOrderStatus } from '../utils/orderStatus.js';
import { round2 } from '../utils/pricing.js';
import { buildPagination } from '../utils/response.js';
import { notify } from './audit.service.js';
import { getPaymentProvider } from './payment.service.js';
import { priceLines } from './pricing.service.js';
import { getSettings } from './settings.service.js';
import { inactiveShopIds } from './shop.service.js';
import { effectivePrice } from '../utils/pricing.js';

const newOrderNumber = () => `MP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export async function loadOrderDetail(order: any) {
  const sellerOrders = await SellerOrder.find({ parentOrder: order._id }).populate('seller', 'name').sort({ orderNumber: 1 });
  return { ...(order.toObject ? order.toObject() : order), sellerOrders: sellerOrders.map((s) => s.toObject()) };
}

export interface CheckoutInput {
  addressId: string;
  paymentMethod: 'card' | 'paypal' | 'cod';
  paymentToken?: string;
  couponCode?: string;
  idempotencyKey: string;
}

export async function checkout(buyerId: string, input: CheckoutInput) {
  const dup = await Order.findOne({ buyer: buyerId, idempotencyKey: input.idempotencyKey });
  if (dup) return { order: await loadOrderDetail(dup), duplicate: true };

  const address = await Address.findOne({ _id: input.addressId, user: buyerId });
  if (!address) throw ApiError.badRequest('Shipping address not found');

  const cart = await Cart.findOne({ user: buyerId });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty', undefined, 'EMPTY_CART');

  // ---- Validate cart against fresh product data (never trust cart snapshots) ----
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } }).populate('shop', 'name status');
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const hidden = new Set((await inactiveShopIds()).map(String));
  const lines = cart.items.map((i) => {
    const p = byId.get(String(i.product));
    if (!p || p.deletedAt || p.status !== 'active' || hidden.has(String((p.shop as any)._id))) {
      throw ApiError.conflict(
        `"${p?.name ?? 'A product in your cart'}" is no longer available. Please remove it from your cart.`,
        'PRODUCT_UNAVAILABLE',
      );
    }
    if (String(p.seller) === String(buyerId)) throw ApiError.badRequest('You cannot purchase your own products');
    if (p.stock < i.quantity) {
      throw ApiError.conflict(`Insufficient stock for "${p.name}" (available: ${p.stock})`, 'INSUFFICIENT_STOCK');
    }
    return { product: p, quantity: i.quantity };
  });

  const settings = await getSettings();
  const pricing = priceLines(lines, settings, input.couponCode);
  if (input.couponCode && !pricing.couponApplied)
    throw ApiError.badRequest('Coupon is invalid, expired or the minimum spend is not met', undefined, 'INVALID_COUPON');

  // ---- Claim the idempotency key by inserting the parent order first ----
  const orderNumber = newOrderNumber();
  let order;
  try {
    order = await Order.create({
      buyer: buyerId,
      orderNumber,
      shippingAddressSnapshot: {
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      tax: pricing.tax,
      discount: pricing.discount,
      couponCode: pricing.couponCode,
      total: pricing.total,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      idempotencyKey: input.idempotencyKey,
    });
  } catch (e: any) {
    if (e.code === 11000) {
      const existing = await Order.findOne({ buyer: buyerId, idempotencyKey: input.idempotencyKey });
      if (existing) return { order: await loadOrderDetail(existing), duplicate: true };
    }
    throw e;
  }

  const reserved: { id: any; qty: number }[] = [];
  const useTx = supportsTransactions();

  const work = async (session?: mongoose.ClientSession) => {
    reserved.length = 0;
    // 1. Reserve stock atomically: the conditional update fails if another buyer got there first.
    for (const l of lines) {
      const res = await Product.updateOne(
        { _id: l.product._id, stock: { $gte: l.quantity }, status: 'active', deletedAt: null },
        { $inc: { stock: -l.quantity, salesCount: l.quantity } },
        { session },
      );
      if (res.modifiedCount !== 1) {
        throw ApiError.conflict(`Insufficient stock for "${l.product.name}"`, 'INSUFFICIENT_STOCK');
      }
      reserved.push({ id: l.product._id, qty: l.quantity });
    }
    // 2. Simulated payment.
    const pay = await getPaymentProvider().charge({
      amount: pricing.total,
      method: input.paymentMethod,
      token: input.paymentToken,
      reference: orderNumber,
    });
    if (!pay.success) throw new ApiError(402, pay.failureReason ?? 'Payment failed', undefined, 'PAYMENT_FAILED');

    // 3. Create seller sub-orders, commission records and inventory log.
    const sellerDocs = pricing.sellers.map((s, idx) => ({
      parentOrder: order!._id,
      orderNumber: `${orderNumber}-S${idx + 1}`,
      seller: s.seller,
      buyer: buyerId,
      shops: [...new Set(s.lines.map((l) => String(l.product.shop._id)))],
      items: s.lines.map((l) => ({
        product: l.product._id,
        shop: l.product.shop._id,
        seller: l.product.seller,
        name: l.product.name,
        image: l.product.images?.[0]?.url,
        sku: l.product.sku,
        shopName: l.product.shop.name,
        unitPrice: effectivePrice(l.product.price, l.product.discount),
        listPrice: l.product.price,
        quantity: l.quantity,
        lineTotal: round2(effectivePrice(l.product.price, l.product.discount) * l.quantity),
      })),
      subtotal: s.subtotal,
      discount: s.discount,
      shippingFee: s.shippingFee,
      tax: s.tax,
      total: s.total,
      commissionRate: s.commissionRate,
      commission: s.commission,
      sellerEarnings: s.sellerEarnings,
      fulfillmentStatus: 'pending',
      statusHistory: [{ status: 'pending' }],
    }));
    const created = await SellerOrder.insertMany(sellerDocs, { session });
    await CommissionRecord.insertMany(
      created.map((so) => ({
        seller: so.seller,
        order: order!._id,
        sellerOrder: so._id,
        grossAmount: round2(so.subtotal - so.discount),
        commissionRate: so.commissionRate,
        commissionAmount: so.commission,
        netAmount: round2(so.subtotal - so.discount - so.commission),
        status: 'pending',
      })),
      { session },
    );
    await InventoryLog.insertMany(
      lines.map((l) => ({
        product: l.product._id,
        seller: l.product.seller,
        change: -l.quantity,
        reason: 'sale',
        order: order!._id,
        actor: buyerId,
      })),
      { session },
    );
    const paid = pay.status === 'paid';
    await Order.updateOne(
      { _id: order!._id },
      {
        $set: {
          sellerOrders: created.map((c) => c._id),
          paymentStatus: paid ? 'paid' : 'pending',
          orderStatus: paid ? 'paid' : 'pending',
          paymentReference: pay.reference,
        },
      },
      { session },
    );
  };

  try {
    if (useTx) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(() => work(session));
      } finally {
        await session.endSession();
      }
    } else {
      await work();
    }
  } catch (err) {
    // Compensation for the non-transactional path (a no-op for already-aborted transactions).
    if (!useTx) {
      await Promise.all(reserved.map((r) => Product.updateOne({ _id: r.id }, { $inc: { stock: r.qty, salesCount: -r.qty } })));
      await Promise.all([
        SellerOrder.deleteMany({ parentOrder: order._id }),
        CommissionRecord.deleteMany({ order: order._id }),
        InventoryLog.deleteMany({ order: order._id, reason: 'sale' }),
      ]);
    }
    await Order.deleteOne({ _id: order._id }); // release the idempotency key; no partial order remains
    throw err;
  }

  await Cart.updateOne({ user: buyerId }, { $set: { items: [] } });
  const full = await Order.findById(order._id);
  const detail = await loadOrderDetail(full);
  await notify(buyerId, 'order_placed', 'Order confirmed', `Order ${orderNumber} was placed successfully.`, `/account/orders/${order._id}`);
  await Promise.all(
    detail.sellerOrders.map((so: any) =>
      notify(
        so.seller?._id ?? so.seller,
        'new_order',
        'New order received',
        `You have a new order ${so.orderNumber} (${so.items.length} item(s)).`,
        `/seller/orders/${so._id}`,
      ),
    ),
  );
  return { order: detail, duplicate: false };
}

export async function listBuyer(buyerId: string, q: { status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = { buyer: buyerId };
  if (q.status) filter.orderStatus = q.status;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Order.countDocuments(filter),
  ]);
  const sellerOrders = await SellerOrder.find({ parentOrder: { $in: orders.map((o) => o._id) } }).select(
    'parentOrder items.name items.image fulfillmentStatus',
  );
  const data = orders.map((o) => {
    const sos = sellerOrders.filter((s) => String(s.parentOrder) === String(o._id));
    return {
      ...o.toObject(),
      itemCount: sos.reduce((n, s) => n + s.items.length, 0),
      preview: sos.flatMap((s) => s.items.map((i) => ({ name: i.name, image: i.image }))).slice(0, 4),
    };
  });
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function getBuyer(buyerId: string, id: string) {
  const order = mongoose.isValidObjectId(id) ? await Order.findOne({ _id: id, buyer: buyerId }) : null;
  if (!order) throw ApiError.notFound('Order not found');
  return loadOrderDetail(order);
}

/** Re-derives parent order + payment status from seller orders. */
export async function recomputeParent(orderId: any) {
  const order = await Order.findById(orderId);
  if (!order) return;
  const sos = await SellerOrder.find({ parentOrder: orderId });
  const refunded = round2(sos.reduce((s, so) => s + so.refundedAmount, 0));
  let paymentStatus = order.paymentStatus;
  if (order.paymentStatus !== 'pending' && order.paymentStatus !== 'failed') {
    paymentStatus = refunded <= 0 ? 'paid' : refunded >= order.total ? 'refunded' : 'partially_refunded';
  }
  const orderStatus = deriveOrderStatus(
    sos.map((s) => s.fulfillmentStatus as FulfillmentStatus),
    paymentStatus as any,
  );
  await Order.updateOne({ _id: orderId }, { $set: { refundedAmount: refunded, paymentStatus, orderStatus } });
}

/** Cancels one seller order: restocks inventory, voids commission, refunds (simulated) if paid. */
export async function cancelSellerOrder(so: any, reason?: string) {
  if (!['pending', 'processing'].includes(so.fulfillmentStatus))
    throw ApiError.conflict(`Cannot cancel an order that is ${so.fulfillmentStatus}`);
  const parent = await Order.findById(so.parentOrder);
  const claimed = await SellerOrder.updateOne(
    { _id: so._id, fulfillmentStatus: { $in: ['pending', 'processing'] } },
    {
      $set: {
        fulfillmentStatus: 'cancelled',
        cancellationRequested: false,
        cancellationReason: reason,
        refundedAmount: parent && parent.paymentStatus !== 'pending' ? round2(so.total) : 0,
      },
      $push: { statusHistory: { status: 'cancelled', at: new Date() } },
    },
  );
  if (claimed.modifiedCount !== 1) throw ApiError.conflict('Order status changed, please retry');
  for (const item of so.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, salesCount: -item.quantity } });
    await InventoryLog.create({
      product: item.product,
      seller: item.seller,
      change: item.quantity,
      reason: 'cancellation',
      order: so.parentOrder,
    });
  }
  await CommissionRecord.updateOne({ sellerOrder: so._id }, { $set: { status: 'cancelled' } });
  await recomputeParent(so.parentOrder);
  await notify(
    so.buyer,
    'order_cancelled',
    'Order cancelled',
    `Seller order ${so.orderNumber} was cancelled.`,
    `/account/orders/${so.parentOrder}`,
  );
}

/** Buyer-initiated cancellation: pending sub-orders cancel immediately; processing ones become cancellation requests. */
export async function cancelByBuyer(buyerId: string, id: string, reason?: string) {
  const order = mongoose.isValidObjectId(id) ? await Order.findOne({ _id: id, buyer: buyerId }) : null;
  if (!order) throw ApiError.notFound('Order not found');
  const sos = await SellerOrder.find({ parentOrder: order._id });
  const cancellable = sos.filter((s) => ['pending', 'processing'].includes(s.fulfillmentStatus));
  if (cancellable.length === 0) throw ApiError.conflict('This order can no longer be cancelled', 'NOT_CANCELLABLE');
  const result = { cancelled: [] as string[], requested: [] as string[] };
  for (const so of cancellable) {
    if (so.fulfillmentStatus === 'pending') {
      await cancelSellerOrder(so, reason);
      result.cancelled.push(so.orderNumber);
    } else {
      await SellerOrder.updateOne({ _id: so._id }, { $set: { cancellationRequested: true, cancellationReason: reason } });
      await notify(
        so.seller,
        'cancellation_request',
        'Cancellation requested',
        `The buyer requested to cancel ${so.orderNumber}.`,
        `/seller/orders/${so._id}`,
      );
      result.requested.push(so.orderNumber);
    }
  }
  await recomputeParent(order._id);
  return { ...result, order: await loadOrderDetail((await Order.findById(order._id))!) };
}

// ---------------- Admin ----------------

export async function adminList(q: { search?: string; status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = {};
  if (q.status) filter.orderStatus = q.status;
  if (q.search) filter.orderNumber = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [data, total] = await Promise.all([
    Order.find(filter)
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Order.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function adminGet(id: string) {
  const order = mongoose.isValidObjectId(id) ? await Order.findById(id).populate('buyer', 'name email') : null;
  if (!order) throw ApiError.notFound('Order not found');
  return loadOrderDetail(order);
}

export async function adminCancelSellerOrder(sellerOrderId: string, reason?: string) {
  const so = mongoose.isValidObjectId(sellerOrderId) ? await SellerOrder.findById(sellerOrderId) : null;
  if (!so) throw ApiError.notFound('Seller order not found');
  await cancelSellerOrder(so, reason ?? 'Cancelled by administrator');
  return SellerOrder.findById(sellerOrderId);
}
