import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    sellerOrder: { type: Schema.Types.ObjectId, ref: 'SellerOrder', required: true, index: true },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, required: true },
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: { type: Number, required: true, min: 1 },
        _id: false,
      },
    ],
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'refunded'],
      default: 'requested',
      index: true,
    },
    refundAmount: { type: Number, default: 0 },
    adminNotes: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
export const ReturnRequest = model('ReturnRequest', schema);
