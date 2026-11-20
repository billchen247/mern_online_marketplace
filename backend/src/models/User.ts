import { Schema, model, type InferSchemaType } from 'mongoose';

export const ROLES = ['user', 'seller', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    roles: {
      type: [{ type: String, enum: ROLES }],
      default: ['user'],
      validate: { validator: (v: string[]) => v.includes('user'), message: 'roles must include "user"' },
    },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active', index: true },
    phone: { type: String, trim: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshTokens: {
      type: [{ hash: String, expiresAt: Date, _id: false }],
      default: [],
      select: false,
    },
  },
  { timestamps: true },
);
userSchema.index({ name: 'text', email: 'text' });
userSchema.index({ roles: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
