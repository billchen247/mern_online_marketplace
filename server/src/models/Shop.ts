import { Schema, model } from 'mongoose';

const imageSchema = new Schema({ url: String, publicId: String }, { _id: false });

const schema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    logo: imageSchema,
    banner: imageSchema,
    contact: { email: String, phone: String, address: String },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    // pending → awaiting moderation (only when moderation enabled); active; inactive (owner); suspended (admin)
    status: { type: String, enum: ['pending', 'active', 'inactive', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true },
);
schema.index({ name: 'text', description: 'text' });
export const Shop = model('Shop', schema);
