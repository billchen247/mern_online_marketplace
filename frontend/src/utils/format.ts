export const formatCurrency = (n: number | undefined | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const titleCase = (s: string) => s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Resolve image URLs: server-hosted `/uploads/...` files live on the API origin. */
export function apiOrigin(base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1'): string {
  return base.replace(/\/api\/v1\/?$/, '');
}
export function imageUrl(url?: string | null): string {
  if (!url) return 'data:image/svg+xml;utf8,' + encodeURIComponent(PLACEHOLDER_SVG);
  return url.startsWith('/uploads') ? `${apiOrigin()}${url}` : url;
}
const PLACEHOLDER_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='#eef0f6'/><text x='200' y='210' font-size='28' text-anchor='middle' fill='#9aa3b8' font-family='Arial'>No image</text></svg>";
