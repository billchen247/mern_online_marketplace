import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ user: 1, read: 1, createdAt: -1 });
export const Notification = model('Notification', schema);
