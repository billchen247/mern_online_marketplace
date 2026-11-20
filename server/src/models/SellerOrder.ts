import { Schema, model } from 'mongoose';

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapshots at purchase time
    name: { type: String, required: true },
    image: { type: String },
    sku: { type: String },
    shopName: { type: String },
    unitPrice: { type: Number, required: true },
    listPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    returnedQuantity: { type: Number, default: 0 },
  },
  { _id: true },
);

const schema = new Schema(
  {
    parentOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shops: [{ type: Schema.Types.ObjectId, ref: 'Shop' }],
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commission: { type: Number, required: true },
    sellerEarnings: { type: Number, required: true },
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    refundedAmount: { type: Number, default: 0 },
    cancellationRequested: { type: Boolean, default: false },
    cancellationReason: { type: String },
    trackingInformation: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
    },
    deliveredAt: Date,
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
  },
  { timestamps: true },
);
schema.index({ seller: 1, createdAt: -1 });
schema.index({ seller: 1, fulfillmentStatus: 1 });
export const SellerOrder = model('SellerOrder', schema);
