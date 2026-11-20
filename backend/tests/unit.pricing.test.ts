import { describe, expect, it } from 'vitest';
import { allocate, calcCommission, calcCouponDiscount, calcShipping, calcTax, effectivePrice, round2 } from '../src/utils/pricing.js';
import { allowedTransitions, canTransition, deriveOrderStatus } from '../src/utils/orderStatus.js';
import { priceLines } from '../src/services/pricing.service.js';

const settings = { shipping: { flatRate: 5, freeShippingThreshold: 100 }, tax: { rate: 10 }, commissionRate: 10, coupons: [{ code: 'SAVE10', percentOff: 10, minSubtotal: 20, active: true }] };

describe('pricing utils', () => {
  it('applies percentage discounts and rounds to cents', () => {
    expect(effectivePrice(19.99, 15)).toBe(16.99);
    expect(effectivePrice(10, 0)).toBe(10);
    expect(effectivePrice(10, 150)).toBe(0);
  });
  it('computes shipping with free threshold', () => {
    expect(calcShipping(50, settings.shipping)).toBe(5);
    expect(calcShipping(100, settings.shipping)).toBe(0);
    expect(calcShipping(0, settings.shipping)).toBe(0);
  });
  it('computes tax and commission', () => {
    expect(calcTax(33.33, 8)).toBe(2.67);
    expect(calcTax(-5, 8)).toBe(0);
    expect(calcCommission(200, 12.5)).toEqual({ commission: 25, net: 175 });
  });
  it('validates coupons', () => {
    const c = settings.coupons[0]!;
    expect(calcCouponDiscount(100, c)).toBe(10);
    expect(calcCouponDiscount(10, c)).toBe(0);
    expect(calcCouponDiscount(100, { ...c, active: false })).toBe(0);
    expect(calcCouponDiscount(100, { ...c, expiresAt: new Date(Date.now() - 1000) })).toBe(0);
    expect(calcCouponDiscount(100, null)).toBe(0);
  });
  it('allocates cents exactly', () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
    expect(allocate(10, [0, 0])).toEqual([0, 0]);
  });
  it('round2 is stable', () => expect(round2(1.005 + 1.005)).toBe(2.01));
});

describe('order status machine', () => {
  it('allows only valid transitions', () => {
    expect(canTransition('pending', 'processing')).toBe(true);
    expect(canTransition('pending', 'shipped')).toBe(false);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(allowedTransitions('shipped')).toEqual(['delivered']);
  });
  it('derives parent status', () => {
    expect(deriveOrderStatus([], 'pending')).toBe('pending');
    expect(deriveOrderStatus(['pending', 'pending'], 'paid')).toBe('paid');
    expect(deriveOrderStatus(['processing', 'pending'], 'paid')).toBe('processing');
    expect(deriveOrderStatus(['shipped', 'pending'], 'paid')).toBe('partially_fulfilled');
    expect(deriveOrderStatus(['shipped', 'delivered'], 'paid')).toBe('shipped');
    expect(deriveOrderStatus(['delivered', 'delivered'], 'paid')).toBe('delivered');
    expect(deriveOrderStatus(['cancelled', 'cancelled'], 'paid')).toBe('cancelled');
    expect(deriveOrderStatus(['cancelled', 'delivered'], 'paid')).toBe('delivered');
    expect(deriveOrderStatus(['delivered'], 'partially_refunded')).toBe('partially_refunded');
    expect(deriveOrderStatus(['cancelled'], 'refunded')).toBe('cancelled');
  });
});

describe('priceLines (multi-seller totals reconcile)', () => {
  const line = (seller: string, price: number, qty: number, discount = 0) => ({ product: { seller, price, discount }, quantity: qty });
  it('splits per seller and reconciles totals', () => {
    const r = priceLines([line('s1', 40, 1), line('s1', 10, 2), line('s2', 33.33, 3, 10)], settings, 'save10');
    expect(r.sellers).toHaveLength(2);
    const sum = (k: 'subtotal' | 'discount' | 'shippingFee' | 'tax' | 'total') => round2(r.sellers.reduce((a, s) => a + s[k], 0));
    expect(sum('subtotal')).toBe(r.subtotal);
    expect(sum('discount')).toBe(r.discount);
    expect(sum('shippingFee')).toBe(r.shippingFee);
    expect(sum('tax')).toBe(r.tax);
    expect(sum('total')).toBe(r.total);
    expect(r.total).toBe(round2(r.subtotal - r.discount + r.shippingFee + r.tax));
    expect(r.couponApplied).toBe(true);
    for (const s of r.sellers) expect(round2(s.subtotal - s.discount - s.commission)).toBe(round2(s.sellerEarnings - s.shippingFee));
  });
  it('ignores unknown coupons', () => {
    const r = priceLines([line('s1', 40, 1)], settings, 'NOPE');
    expect(r.couponApplied).toBe(false);
    expect(r.discount).toBe(0);
  });
});
