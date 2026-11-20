import type { Response } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok(res: Response, message: string, data: unknown = null, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res: Response, message: string, data: unknown = null) {
  return ok(res, message, data, 201);
}

export function paginated(res: Response, message: string, data: unknown[], pagination: Pagination) {
  return res.status(200).json({ success: true, message, data, pagination });
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
