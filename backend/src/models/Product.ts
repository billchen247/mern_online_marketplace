import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    images: [{ url: String, publicId: String, _id: false }],
    price: { type: Number, required: true, min: 0.01 },
    discount: { type: Number, default: 0, min: 0, max: 100 }, // percent
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    sku: { type: String, required: true, trim: true },
    specifications: [{ key: String, value: String, _id: false }],
    // draft/inactive: hidden; active: public; out_of_stock is derived from stock; blocked: admin moderation
    status: { type: String, enum: ['draft', 'pending', 'active', 'inactive', 'blocked'], default: 'active', index: true },
    featured: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ name: 'text', description: 'text' }, { weights: { name: 5, description: 1 } });
schema.index({ shop: 1, sku: 1 }, { unique: true });
schema.index({ status: 1, category: 1, price: 1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ status: 1, salesCount: -1 });
export const Product = model('Product', schema);
