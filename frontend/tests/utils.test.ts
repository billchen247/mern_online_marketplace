import { describe, expect, it } from 'vitest';
import { clampQuantity, cartItemCount, cartSubtotal, effectivePrice, round2 } from '../src/utils/pricing';
import { decideAccess, hasAnyRole, hasRole, isAdmin, isSeller } from '../src/utils/roles';
import { apiOrigin, formatCurrency, formatDate, formatDateTime, imageUrl, titleCase } from '../src/utils/format';
import { AxiosError } from 'axios';
import { getErrorMessage } from '../src/utils/errors';

describe('pricing', () => {
  it('rounds and applies discounts', () => {
    expect(round2(1.005 + 0.0001)).toBe(1.01);
    expect(effectivePrice(100, 15)).toBe(85);
    expect(effectivePrice(19.99, 0)).toBe(19.99);
  });
  it('sums carts and clamps quantities', () => {
    const items = [
      { quantity: 2, product: { finalPrice: 10 } },
      { quantity: 1, product: { finalPrice: 5.5 } },
      { quantity: 3, product: null },
    ] as never;
    expect(cartSubtotal(items)).toBe(25.5);
    expect(cartItemCount(items)).toBe(6);
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(9, 5)).toBe(5);
    expect(clampQuantity(Number.NaN, 5)).toBe(1);
  });
});

describe('roles', () => {
  const both = { roles: ['user', 'seller', 'admin'] } as never;
  const buyer = { roles: ['user'] } as never;
  it('checks roles additively', () => {
    expect(hasRole(both, 'seller')).toBe(true);
    expect(hasRole(buyer, 'admin')).toBe(false);
    expect(hasRole(null, 'user')).toBe(false);
    expect(hasAnyRole(buyer, ['admin', 'seller'])).toBe(false);
    expect(isSeller(both) && isAdmin(both)).toBe(true);
  });
  it('decides access', () => {
    expect(decideAccess({ loading: true, user: null })).toBe('loading');
    expect(decideAccess({ loading: false, user: null }, ['admin'])).toBe('login');
    expect(decideAccess({ loading: false, user: buyer }, ['admin'])).toBe('forbidden');
    expect(decideAccess({ loading: false, user: both }, ['admin'])).toBe('allow');
    expect(decideAccess({ loading: false, user: buyer })).toBe('allow');
  });
});

describe('format', () => {
  it('formats money, dates and strings', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatDate('2026-01-15T12:00:00Z')).toMatch(/2026/);
    expect(formatDateTime('2026-01-15T12:00:00Z')).toMatch(/2026/);
    expect(formatDate(undefined)).toBe('—');
    expect(titleCase('partially_fulfilled')).toBe('Partially Fulfilled');
  });
  it('resolves image urls', () => {
    expect(imageUrl('https://x.test/a.jpg')).toBe('https://x.test/a.jpg');
    expect(imageUrl('/uploads/a.jpg')).toBe(`${apiOrigin()}/uploads/a.jpg`);
    expect(imageUrl(undefined)).toMatch(/^data:|placeholder|^\/|^https?:/);
  });
});

describe('getErrorMessage', () => {
  const axiosErr = (data?: unknown, code?: string) =>
    new AxiosError(
      'Request failed',
      code,
      undefined,
      undefined,
      data === undefined ? undefined : ({ data, status: 400, statusText: '', headers: {}, config: {} as never } as never),
    );
  it('extracts messages from several shapes', () => {
    expect(getErrorMessage(axiosErr({ message: 'Nope' }))).toBe('Nope');
    expect(getErrorMessage(axiosErr({ message: 'Invalid', errors: [{ message: 'bad email' }] }))).toBe('Invalid bad email');
    expect(getErrorMessage(axiosErr(undefined, 'ERR_NETWORK'))).toMatch(/Cannot reach/);
    expect(getErrorMessage(axiosErr())).toBe('Request failed');
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('weird')).toMatch(/wrong/);
    expect(getErrorMessage(null, 'custom')).toBe('custom');
  });
});
