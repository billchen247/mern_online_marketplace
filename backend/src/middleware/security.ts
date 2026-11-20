import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from /uploads to load in the SPA
});

/** CORS only controls which browser origins may read responses; it is NOT an access-control mechanism. */
export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin || env.allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
});

const passthrough: RequestHandler = (_req, _res, next) => next();

const limiter = (max: number, windowMs: number): RequestHandler =>
  env.rateLimit.enabled
    ? rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests, please try again later' },
      })
    : passthrough;

export const globalLimiter = limiter(env.rateLimit.max, 60_000);
export const authLimiter = limiter(env.rateLimit.authMax, 15 * 60_000);

/** Removes MongoDB operator injection ($-prefixed / dotted keys) from parsed input. */
export const sanitizeInput: RequestHandler = (req, _res, next) => {
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([k]) => !k.startsWith('$') && !k.includes('.'))
          .map(([k, val]) => [k, clean(val)]),
      );
    }
    return v;
  };
  if (req.body) req.body = clean(req.body);
  next();
};
