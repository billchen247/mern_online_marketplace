import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    key: { type: String, default: 'marketplace', unique: true },
    marketplaceName: { type: String, default: 'Bazaarly' },
    tagline: { type: String, default: 'Shop independent sellers, all in one place' },
    primaryColor: { type: String, default: '#4f46e5' },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    shipping: {
      flatRate: { type: Number, default: 5.99, min: 0 },
      freeShippingThreshold: { type: Number, default: 75, min: 0 },
    },
    tax: { rate: { type: Number, default: 8, min: 0, max: 100 } },
    moderation: {
      requireProductApproval: { type: Boolean, default: false },
      requireShopApproval: { type: Boolean, default: false },
    },
    coupons: [
      {
        code: { type: String, uppercase: true, trim: true },
        percentOff: { type: Number, min: 1, max: 100 },
        minSubtotal: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
        expiresAt: Date,
        _id: false,
      },
    ],
  },
  { timestamps: true },
);
export const Settings = model('Settings', schema);
