import 'dotenv/config';
import { z } from 'zod';

const bool = (d: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? d : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_EXTRA_ORIGINS: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  RATE_LIMIT_ENABLED: bool(true),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(30),
  ALLOW_SEED: bool(false),
  COOKIE_SECURE: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
});

const parsed = schema.parse(process.env);
const isProd = parsed.NODE_ENV === 'production';
const isTest = parsed.NODE_ENV === 'test';

function secret(value: string | undefined, name: string): string {
  if (value && value.length >= 16) return value;
  if (isProd) throw new Error(`${name} must be set (min 16 chars) in production`);
  // Non-production fallback is derived, never a fixed literal shared with prod.
  return `dev-only-${name.toLowerCase()}-${parsed.NODE_ENV}-change-me`;
}

if (isProd && !parsed.MONGODB_URI) throw new Error('MONGODB_URI must be set in production');

export const env = {
  nodeEnv: parsed.NODE_ENV,
  isProd,
  isTest,
  port: parsed.PORT,
  mongoUri: parsed.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/mern_online_marketplace',
  jwtSecret: secret(parsed.JWT_SECRET, 'JWT_SECRET'),
  jwtRefreshSecret: secret(parsed.JWT_REFRESH_SECRET ?? parsed.JWT_SECRET, 'JWT_REFRESH_SECRET'),
  accessTokenTtl: parsed.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: parsed.REFRESH_TOKEN_TTL_DAYS,
  clientUrl: parsed.CLIENT_URL,
  allowedOrigins: [
    parsed.CLIENT_URL,
    ...parsed.CORS_EXTRA_ORIGINS.split(',').map((s) => s.trim()),
    ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173']),
  ].filter(Boolean),
  cloudinary: {
    cloudName: parsed.CLOUDINARY_CLOUD_NAME,
    apiKey: parsed.CLOUDINARY_API_KEY,
    apiSecret: parsed.CLOUDINARY_API_SECRET,
    enabled: Boolean(
      parsed.CLOUDINARY_CLOUD_NAME && parsed.CLOUDINARY_API_KEY && parsed.CLOUDINARY_API_SECRET,
    ),
  },
  rateLimit: {
    enabled: parsed.RATE_LIMIT_ENABLED && !isTest,
    max: parsed.RATE_LIMIT_MAX,
    authMax: parsed.AUTH_RATE_LIMIT_MAX,
  },
  allowSeed: parsed.ALLOW_SEED,
  cookieSecure: parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === 'true' : isProd,
  cookieSameSite: parsed.COOKIE_SAMESITE ?? (isProd ? 'none' : 'lax'),
  bcryptRounds: isTest ? 4 : parsed.BCRYPT_ROUNDS,
};
