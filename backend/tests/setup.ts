import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri) throw new Error('TEST_MONGO_URI not set; refusing to run tests without the in-memory database');
  await mongoose.connect(uri, { dbName: `test_${Math.random().toString(36).slice(2, 10)}` });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  const cols = await mongoose.connection.db!.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
