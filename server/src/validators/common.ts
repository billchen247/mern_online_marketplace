import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
};
export const pageQuery = z.object(paginationQuery);
export const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
export const imageRef = z.object({ url: z.string().min(1).max(500), publicId: z.string().max(300).optional() });
