import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
        seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
      },
    ],
  },
  { timestamps: true },
);
export const Cart = model('Cart', schema);
