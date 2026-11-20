import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureIndexes } from './utils/indexes.js';

async function main() {
  await connectDb();
  await ensureIndexes();
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`API listening on 0.0.0.0:${env.port} (${env.nodeEnv})`);
  });
  server.on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal startup error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
