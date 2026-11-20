import {
  allocate,
  calcCommission,
  calcCouponDiscount,
  calcShipping,
  calcTax,
  effectivePrice,
  fromCents,
  round2,
  toCents,
} from '../utils/pricing.js';

export interface PricedLine {
  product: any;
  quantity: number;
}

/**
 * Computes the full price breakdown for a set of cart lines grouped per seller.
 * Single source of truth used by both cart preview and checkout so totals always reconcile.
 */
export function priceLines(lines: PricedLine[], settings: any, couponCode?: string | null) {
  const coupon = couponCode ? ((settings.coupons ?? []).find((c: any) => c.code === couponCode.toUpperCase()) ?? null) : null;

  const groups = new Map<string, PricedLine[]>();
  for (const l of lines) {
    const key = String(l.product.seller);
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  const sellerKeys = [...groups.keys()];
  const subtotals = sellerKeys.map((k) =>
    groups.get(k)!.reduce((sum, l) => sum + toCents(effectivePrice(l.product.price, l.product.discount)) * l.quantity, 0),
  );
  const subtotalCents = subtotals.reduce((a, b) => a + b, 0);
  const discountTotal = calcCouponDiscount(fromCents(subtotalCents), coupon);
  const discounts = allocate(toCents(discountTotal), subtotals);

  const sellers = sellerKeys.map((sellerId, i) => {
    const subtotal = fromCents(subtotals[i]!);
    const discount = fromCents(discounts[i]!);
    const shippingFee = calcShipping(subtotal, settings.shipping);
    const tax = calcTax(subtotal - discount, settings.tax.rate);
    const { commission, net } = calcCommission(round2(subtotal - discount), settings.commissionRate);
    return {
      seller: sellerId,
      lines: groups.get(sellerId)!,
      subtotal,
      discount,
      shippingFee,
      tax,
      total: round2(subtotal - discount + shippingFee + tax),
      commissionRate: settings.commissionRate as number,
      commission,
      sellerEarnings: round2(net + shippingFee),
    };
  });

  const sum = (f: (s: (typeof sellers)[number]) => number) => fromCents(sellers.reduce((a, s) => a + toCents(f(s)), 0));
  return {
    sellers,
    couponCode: coupon && discountTotal > 0 ? coupon.code : null,
    couponApplied: Boolean(coupon && discountTotal > 0),
    subtotal: sum((s) => s.subtotal),
    discount: sum((s) => s.discount),
    shippingFee: sum((s) => s.shippingFee),
    tax: sum((s) => s.tax),
    total: sum((s) => s.total),
  };
}
