import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    businessDescription: { type: String, required: true, trim: true, maxlength: 2000 },
    contactInformation: {
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
    },
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
// Only one open (pending) application per user.
schema.index({ user: 1 }, { unique: true, partialFilterExpression: { applicationStatus: 'pending' }, name: 'one_pending_per_user' });
export const SellerApplication = model('SellerApplication', schema);
