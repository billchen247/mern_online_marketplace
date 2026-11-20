/**
 * Starts the API against a throw-away in-memory MongoDB seeded with demo data.
 * Used for offline demos and for Playwright e2e runs — NEVER touches Atlas.
 *   npm run dev:memory -w backend
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION ?? '7.0.24' } });
process.env.MONGODB_URI = mongod.getUri('mern_online_marketplace_e2e');
process.env.NODE_ENV = process.env.NODE_ENV === 'production' ? 'development' : (process.env.NODE_ENV ?? 'development');
process.env.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED ?? 'false';

const { connectDb, disconnectDb } = await import('../config/db.js');
const { seedDatabase } = await import('./seed.js');
await connectDb();
const result = await seedDatabase({ log: () => undefined });
await disconnectDb();
console.log('Seeded in-memory database:', JSON.stringify(result));

await import('../server.js');

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
