/**
 * Pure money functions. All amounts are handled in integer cents internally and
 * returned as decimal currency units rounded to 2 places.
 */
export const toCents = (n: number) => Math.round(n * 100);
export const fromCents = (c: number) => c / 100;
export const round2 = (n: number) => fromCents(toCents(n));

export function effectivePrice(price: number, discountPercent: number): number {
  const pct = Math.min(Math.max(discountPercent || 0, 0), 100);
  return fromCents(Math.round(toCents(price) * (1 - pct / 100)));
}

export interface ShippingSettings {
  flatRate: number;
  freeShippingThreshold: number;
}
export function calcShipping(subtotal: number, s: ShippingSettings): number {
  if (subtotal <= 0) return 0;
  if (s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  return round2(s.flatRate);
}

export function calcTax(taxableAmount: number, ratePercent: number): number {
  return fromCents(Math.round(toCents(Math.max(taxableAmount, 0)) * (ratePercent / 100)));
}

export function calcCommission(netItemAmount: number, ratePercent: number) {
  const commission = fromCents(Math.round(toCents(netItemAmount) * (ratePercent / 100)));
  return { commission, net: round2(netItemAmount - commission) };
}

export interface Coupon {
  code: string;
  percentOff: number;
  minSubtotal: number;
  active: boolean;
  expiresAt?: Date | string | null;
}
export function calcCouponDiscount(subtotal: number, coupon: Coupon | null, now = new Date()): number {
  if (!coupon || !coupon.active) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return 0;
  if (subtotal < coupon.minSubtotal) return 0;
  return fromCents(Math.round(toCents(subtotal) * (coupon.percentOff / 100)));
}

/** Splits `totalCents` across weights so that parts sum exactly (largest remainder). */
export function allocate(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || totalCents === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (totalCents * w) / sum);
  const floors = raw.map(Math.floor);
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i]! += 1;
    remainder -= 1;
  }
  return floors;
}
