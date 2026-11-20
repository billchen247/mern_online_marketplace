import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    reference: { type: String, required: true, unique: true },
    simulated: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const PayoutRecord = model('PayoutRecord', schema);
