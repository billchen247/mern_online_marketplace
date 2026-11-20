import mongoose from 'mongoose';
import './../models/index.js';

/** Builds declared indexes explicitly (autoIndex is unreliable on cold start in production). */
export async function ensureIndexes() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}
