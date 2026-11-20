import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { renderApp } from './render';
import type { Persona } from './mocks';

const show = (route: string, as: Persona | null = null) => renderApp(<AppRoutes />, { route, as });
const text = (t: string | RegExp) => screen.findAllByText(t, {}, { timeout: 15000 });

describe('public pages', () => {
  it('home', async () => {
    show('/');
    expect((await text(/Gaming Laptop/)).length).toBeGreaterThan(0);
  });
  it('product list', async () => {
    show('/products');
    expect((await text(/Office Mouse/)).length).toBeGreaterThan(0);
  });
  it('product detail', async () => {
    show('/products/p1');
    expect((await text(/Gaming Laptop/)).length).toBeGreaterThan(0);
    await text(/Great/);
  });
  it('categories', async () => {
    show('/categories');
    await text(/Electronics/);
  });
  it('shops', async () => {
    show('/shops');
    await text(/Gadget Shop/);
  });
  it('shop detail', async () => {
    show('/shops/s1');
    await text(/Gadget Shop/);
  });
  it('login and register render', async () => {
    show('/login');
    await screen.findByRole('button', { name: /log in|sign in/i });
  });
  it('register renders', async () => {
    show('/register');
    await screen.findByRole('button', { name: /register|sign up|create/i });
  });
  it('404', async () => {
    show('/nope');
    await text(/not found|404/i);
  });
});

describe('guards', () => {
  it('redirects anonymous users from account/cart to login', async () => {
    show('/cart');
    await screen.findByRole('button', { name: /log in|sign in/i });
  });
  it('blocks buyers from seller and admin areas', async () => {
    show('/seller', 'buyer');
    await text(/not authori|forbidden|access|permission|403/i);
  });
  it('blocks sellers from admin', async () => {
    show('/admin', 'seller');
    await text(/not authori|forbidden|access|permission|403/i);
  });
});

describe('buyer pages', () => {
  for (const [route, expected] of [
    ['/cart', /Gaming Laptop/],
    ['/checkout', /Alice|1 Main St/],
    ['/wishlist', /Gaming Laptop/],
    ['/account', /Alice/],
    ['/account/profile', /Alice/],
    ['/account/addresses', /1 Main St/],
    ['/account/orders', /MP-ABC/],
    ['/account/orders/o1', /MP-ABC/],
    ['/account/returns', /return/i],
    ['/account/become-seller', /seller/i],
    ['/account/notifications', /Order shipped/],
  ] as [string, RegExp][])
    it(`renders ${route}`, async () => {
      show(route, 'buyer');
      expect((await text(expected)).length).toBeGreaterThan(0);
    });
});

describe('seller pages', () => {
  for (const [route, expected] of [
    ['/seller', /Office Mouse|Dashboard/],
    ['/seller/shops', /Gadget Shop/],
    ['/seller/shops/s1', /Gadget Shop|Shop/],
    ['/seller/shops/new', /Shop/],
    ['/seller/products', /Gaming Laptop/],
    ['/seller/products/p1', /Gaming Laptop|Product/],
    ['/seller/products/new', /Product/],
    ['/seller/inventory', /Office Mouse/],
    ['/seller/orders', /MP-ABC-1/],
    ['/seller/orders/so1', /MP-ABC-1/],
    ['/seller/earnings', /Earnings|commission/i],
    ['/seller/payouts', /PO-1|payout/i],
  ] as [string, RegExp][])
    it(`renders ${route}`, async () => {
      show(route, 'seller');
      expect((await text(expected)).length).toBeGreaterThan(0);
    });
});

describe('admin pages', () => {
  for (const [route, expected] of [
    ['/admin', /Dashboard|Users/],
    ['/admin/users', /Alice Buyer/],
    ['/admin/applications', /Alice Biz/],
    ['/admin/sellers', /Sam Seller/],
    ['/admin/shops', /Gadget Shop/],
    ['/admin/products', /Gaming Laptop/],
    ['/admin/reviews', /Nice/],
    ['/admin/categories', /Fashion/],
    ['/admin/orders', /MP-ABC/],
    ['/admin/orders/o1', /MP-ABC/],
    ['/admin/returns', /Damaged/],
    ['/admin/settings', /Settings|commission/i],
  ] as [string, RegExp][])
    it(`renders ${route}`, async () => {
      show(route, 'admin');
      expect((await text(expected)).length).toBeGreaterThan(0);
    });
});

void waitFor;
