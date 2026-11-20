import { Schema, model } from 'mongoose';

const addressSnapshot = new Schema(
  {
    recipientName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false },
);

const schema = new Schema(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    sellerOrders: [{ type: Schema.Types.ObjectId, ref: 'SellerOrder' }],
    shippingAddressSnapshot: { type: addressSnapshot, required: true },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    tax: { type: Number, required: true },
    discount: { type: Number, required: true, default: 0 },
    couponCode: { type: String },
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paymentReference: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'partially_fulfilled',
        'partially_refunded',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },
    refundedAmount: { type: Number, default: 0 },
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true },
);
schema.index({ buyer: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ buyer: 1, createdAt: -1 });
schema.index({ createdAt: -1 });
export const Order = model('Order', schema);
