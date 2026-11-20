import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    sellerOrder: { type: Schema.Types.ObjectId, ref: 'SellerOrder', required: true, unique: true },
    grossAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    // pending: awaiting delivery; completed: delivered, payable; refunded; cancelled
    status: { type: String, enum: ['pending', 'completed', 'refunded', 'cancelled'], default: 'pending' },
  },
  { timestamps: true },
);
export const CommissionRecord = model('CommissionRecord', schema);
