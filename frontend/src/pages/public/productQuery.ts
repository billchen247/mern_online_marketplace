import type { ProductQuery } from '../../types';

/** Parses URL search params into the backend product query (all filtering is server-side). */
export function paramsToQuery(sp: URLSearchParams): ProductQuery {
  const num = (k: string) => (sp.get(k) !== null && sp.get(k) !== '' && !Number.isNaN(Number(sp.get(k))) ? Number(sp.get(k)) : undefined);
  return {
    page: num('page') ?? 1,
    limit: 12,
    search: sp.get('search') ?? undefined,
    category: sp.get('category') ?? undefined,
    shop: sp.get('shop') ?? undefined,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    inStock: sp.get('inStock') === 'true' ? true : undefined,
    sortBy: (sp.get('sortBy') as ProductQuery['sortBy']) ?? 'newest',
    order: (sp.get('order') as ProductQuery['order']) ?? (sp.get('sortBy') === 'price' ? 'asc' : 'desc'),
  };
}
