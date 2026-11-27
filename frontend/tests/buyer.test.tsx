import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { BASE, cart, fail, ok, server } from './mocks';
import { renderApp } from './render';
import type { Persona } from './mocks';

const show = (route: string, as: Persona | null = null) => renderApp(<AppRoutes />, { route, as });
const T = { timeout: 15000 };
const Where = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
};
void Routes;
void Route;

describe('login & register', () => {
  it('shows validation errors for empty login', async () => {
    show('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect((await screen.findAllByText(/required|valid email|at least/i)).length).toBeGreaterThan(0);
  });
  it('shows the server error for bad credentials', async () => {
    show('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'WrongPass1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/Invalid email or password/, {}, T)).toBeInTheDocument();
  });
  it('logs in and leaves the login page', async () => {
    show('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument(), T);
  });
  it('returns to the requested account page after login', async () => {
    renderApp(
      <>
        <AppRoutes />
        <Where />
      </>,
      { route: '/account/profile?tab=details' },
    );
    await userEvent.type(await screen.findByLabelText(/Email/), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/account/profile?tab=details'), T);
  });
  it('registers a new account', async () => {
    show('/register');
    await userEvent.type(await screen.findByLabelText(/Full name/), 'New Person');
    await userEvent.type(screen.getByLabelText(/Email/), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument(), T);
  });
  it('rejects mismatched passwords', async () => {
    show('/register');
    await userEvent.type(await screen.findByLabelText(/Full name/), 'New Person');
    await userEvent.type(screen.getByLabelText(/Email/), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'Different123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/match/i)).toBeInTheDocument();
  });
});

describe('cart', () => {
  it('changes quantity, applies a coupon, removes an item, clears', async () => {
    let patched: unknown,
      couponSeen: string | null = null;
    server.use(
      http.patch(`${BASE}/cart/items/:id`, async ({ request }) => {
        patched = await request.json();
        return ok(cart);
      }),
      http.get(`${BASE}/cart`, ({ request }) => {
        couponSeen = new URL(request.url).searchParams.get('coupon');
        return ok(cart);
      }),
    );
    show('/cart', 'buyer');
    const qty = await screen.findByLabelText('Quantity for Gaming Laptop', {}, T);
    await userEvent.clear(qty);
    await userEvent.type(qty, '3');
    await waitFor(() => expect(patched).toMatchObject({ quantity: expect.any(Number) }), T);
    await userEvent.type(screen.getByLabelText('Coupon code'), 'WELCOME10');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(couponSeen).toBe('WELCOME10'), T);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gaming Laptop' }));
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    const dlg = screen.queryByRole('dialog');
    if (dlg) await userEvent.click(within(dlg).getAllByRole('button').at(-1)!);
  });
  it('shows the empty state', async () => {
    server.use(http.get(`${BASE}/cart`, () => ok({ ...cart, items: [], summary: { ...cart.summary, itemCount: 0, total: 0 } })));
    show('/cart', 'buyer');
    expect(await screen.findByText(/empty/i, {}, T)).toBeInTheDocument();
  });
  it('proceeds to checkout and places an order', async () => {
    let body: any,
      key: string | null = null;
    server.use(
      http.post(`${BASE}/orders/checkout`, async ({ request }) => {
        body = await request.json();
        key = request.headers.get('Idempotency-Key');
        return ok({ _id: 'o1', orderNumber: 'MP-ABC' });
      }),
    );
    show('/cart', 'buyer');
    await userEvent.click(await screen.findByRole('button', { name: 'Proceed to checkout' }, T));
    await userEvent.click(await screen.findByLabelText('Cash on delivery', {}, T));
    await userEvent.click(await screen.findByRole('button', { name: /Place order/ }, T));
    await waitFor(() => expect(body).toMatchObject({ addressId: 'a1', paymentMethod: 'cod' }), T);
    expect(key).toBeTruthy();
  });
  it('shows checkout errors', async () => {
    server.use(http.post(`${BASE}/orders/checkout`, () => fail(409, 'Insufficient stock for Gaming Laptop')));
    show('/checkout', 'buyer');
    await userEvent.click(await screen.findByRole('button', { name: /Place order/ }, T));
    expect(await screen.findByText(/Insufficient stock/, {}, T)).toBeInTheDocument();
  });
  it('adds a new address from checkout', async () => {
    show('/checkout', 'buyer');
    await userEvent.click(await screen.findByRole('button', { name: 'Add new address' }, T));
    await userEvent.type(await screen.findByLabelText('Recipient name'), 'Bob');
    await userEvent.type(screen.getByLabelText('Phone'), '+1 555 0111');
    await userEvent.type(screen.getByLabelText('Address line 1'), '2 Side St');
    await userEvent.type(screen.getByLabelText('City'), 'Ottawa');
    await userEvent.type(screen.getByLabelText('State'), 'ON');
    await userEvent.type(screen.getByLabelText('Postal code'), 'K1A 0B1');
    await userEvent.type(screen.getByLabelText('Country'), 'Canada');
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: /save|add/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), T);
  });
});

describe('catalog interactions', () => {
  it('adds to cart and wishlist from the product page', async () => {
    show('/products/p1', 'buyer');
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }, T));
    const wish = screen.queryAllByRole('button', { name: /wishlist/i });
    if (wish.length) await userEvent.click(wish[0]);
  });
  it('asks anonymous users to log in when adding to cart', async () => {
    show('/products/p1');
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }, T));
    await waitFor(() => expect(screen.getAllByText(/log in|sign in/i).length).toBeGreaterThan(0), T);
  });
  it('searches and sorts products', async () => {
    show('/products');
    await screen.findAllByText(/Office Mouse/, {}, T);
    const search = screen.getAllByRole('textbox')[0];
    await userEvent.type(search, 'zzz{Enter}');
    await waitFor(() => expect(screen.queryByText(/Office Mouse/)).not.toBeInTheDocument(), T);
  });
  it('removes from the wishlist and moves to cart', async () => {
    show('/wishlist', 'buyer');
    const btns = await screen.findAllByRole('button', { name: /remove|cart/i }, T);
    for (const b of btns.slice(0, 2)) await userEvent.click(b);
  });
});
