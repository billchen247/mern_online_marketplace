import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodType, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(new ApiError(400, 'Validation failed', details, 'VALIDATION_ERROR'));
    }
    req.valid ??= {};
    req.valid[source] = result.data;
    if (source === 'body') req.body = result.data;
    next();
  };
