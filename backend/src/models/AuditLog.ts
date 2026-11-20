import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, index: true },
    targetType: String,
    target: Schema.Types.ObjectId,
    details: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const AuditLog = model('AuditLog', schema);
