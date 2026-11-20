import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = 'Internal server error';
  let details: unknown;
  let code: string | undefined;

  if (err instanceof ApiError) {
    ({ statusCode: status, message, details, code } = err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB)' : err.message;
  } else if (err?.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyPattern ?? {}).join(', ') || 'unique field'}`;
    code = 'DUPLICATE';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  }

  if (status >= 500) {
    if (!env.isTest) console.error('[error]', err);
    if (!env.isProd) details = { stack: String(err?.stack ?? err) };
  }
  res.status(status).json({ success: false, message, ...(code && { code }), ...(details !== undefined && { errors: details }) });
};
