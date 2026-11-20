export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function effectivePrice(price: number, discountPercent = 0): number {
  return round2(price * (1 - Math.min(Math.max(discountPercent, 0), 100) / 100));
}

export interface LineLike {
  quantity: number;
  product: { finalPrice: number } | null;
  available?: boolean;
}
/** Display-only subtotal; the backend recalculates every amount at checkout. */
export function cartSubtotal(items: LineLike[]): number {
  return round2(items.reduce((s, i) => (i.product && i.available !== false ? s + i.product.finalPrice * i.quantity : s), 0));
}
export const cartItemCount = (items: { quantity: number }[]) => items.reduce((n, i) => n + i.quantity, 0);
export const clampQuantity = (q: number, stock: number, max = 99) => Math.max(1, Math.min(Math.floor(q) || 1, stock, max));
