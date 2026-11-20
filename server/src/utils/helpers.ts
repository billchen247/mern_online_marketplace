import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

export function randomSuffix(len = 5): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

export function toObjectId(id: string, label = 'id'): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`);
  return new mongoose.Types.ObjectId(id);
}

export function sameId(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
}

/** Strips keys with undefined values (for building $set payloads). */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
