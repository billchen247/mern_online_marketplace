import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { corsMiddleware, globalLimiter, helmetMiddleware, sanitizeInput } from './middleware/security.js';
import routes from './routes/index.js';
import { UPLOAD_DIR } from './services/upload.service.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy: correct client IPs for rate limiting
  app.disable('x-powered-by');
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      success: dbUp,
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      env: env.nodeEnv,
    });
  });
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));
  app.use('/api/v1', globalLimiter, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
