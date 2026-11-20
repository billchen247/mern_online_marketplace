import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb(uri = env.mongoUri): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  try {
    return await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

/** True when the connected deployment supports multi-document transactions (replica set / sharded). */
export function supportsTransactions(): boolean {
  const client = mongoose.connection.getClient() as unknown as {
    topology?: { description?: { type?: string } };
  };
  const type = client.topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
}
