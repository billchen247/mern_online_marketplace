import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    change: { type: Number, required: true },
    resultingStock: { type: Number },
    reason: { type: String, enum: ['initial', 'adjustment', 'sale', 'cancellation', 'return'], required: true },
    note: String,
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const InventoryLog = model('InventoryLog', schema);
