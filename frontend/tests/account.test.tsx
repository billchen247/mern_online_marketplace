import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { AccountHome, AddressesPage, BecomeSellerPage, NotificationsPage, ProfilePage } from '../src/pages/account/AccountPages';
import { BASE, address, fail, ok, paged, server, users } from './mocks';
import { renderApp, settled } from './render';

const T = { timeout: 15000 };

describe('AccountHome', () => {
  it('greets the user by first name and lists their roles', async () => {
    renderApp(<AccountHome />, { as: 'buyer' });
    await settled();
    expect(await screen.findByRole('heading', { name: 'Hello, Alice' })).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('offers the seller portal to sellers and the application to buyers', async () => {
    const { unmount } = renderApp(<AccountHome />, { as: 'seller' });
    await settled();
    expect(await screen.findByText('Seller portal')).toBeInTheDocument();
    expect(screen.queryByText('Become a seller')).not.toBeInTheDocument();
    unmount();

    renderApp(<AccountHome />, { as: 'buyer' });
    await settled();
    expect(await screen.findByText('Become a seller')).toBeInTheDocument();
    expect(screen.queryByText('Seller portal')).not.toBeInTheDocument();
  });

  it('links each card to its destination', async () => {
    renderApp(<AccountHome />, { as: 'buyer' });
    await settled();
    const orders = await screen.findByText('Orders');
    expect(orders.closest('.MuiCard-root')!.querySelector('a')).toHaveAttribute('href', '/account/orders');
    expect(screen.getByText('Addresses').closest('.MuiCard-root')!.querySelector('a')).toHaveAttribute('href', '/account/addresses');
  });
});

describe('ProfilePage', () => {
  it('pre-fills the form from the signed-in user', async () => {
    renderApp(<ProfilePage />, { as: 'buyer' });
    await settled();
    expect(await screen.findByDisplayValue(users.buyer.name)).toBeInTheDocument();
  });

  it('saves profile changes and shows a success toast', async () => {
    let body: unknown;
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        body = await request.json();
        return ok({ ...users.buyer, name: 'New Name' });
      }),
    );
    renderApp(<ProfilePage />, { as: 'buyer' });
    await settled();
    const user = userEvent.setup();
    const name = await screen.findByDisplayValue(users.buyer.name);
    await user.clear(name);
    await user.type(name, 'New Name');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Profile updated', {}, T)).toBeInTheDocument();
    expect(body).toMatchObject({ name: 'New Name' });
  });

  it('shows the error toast when the profile update fails', async () => {
    server.use(http.patch(`${BASE}/users/me`, () => fail(400, 'Name is taken')));
    renderApp(<ProfilePage />, { as: 'buyer' });
    await settled();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Name is taken', {}, T)).toBeInTheDocument();
    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument();
  });

  it('submits a password change with the current and new password', async () => {
    let body: unknown;
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        body = await request.json();
        return ok(users.buyer);
      }),
    );
    renderApp(<ProfilePage />, { as: 'buyer' });
    await settled();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Current password'), 'OldPassword1');
    await user.type(screen.getByLabelText('New password'), 'NewPassword2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Password changed', {}, T)).toBeInTheDocument();
    expect(body).toEqual({ currentPassword: 'OldPassword1', newPassword: 'NewPassword2' });
  });

  it('does not submit the password form when fields are empty', async () => {
    let called = false;
    server.use(
      http.patch(`${BASE}/users/me`, () => {
        called = true;
        return ok(users.buyer);
      }),
    );
    renderApp(<ProfilePage />, { as: 'buyer' });
    await settled();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Change password' }));
    await new Promise((r) => setTimeout(r, 100));
    expect(called).toBe(false);
  });
});

describe('AddressesPage', () => {
  it('lists saved addresses and marks the default one', async () => {
    renderApp(<AddressesPage />, { as: 'buyer' });
    expect(await screen.findByTestId('address-card', {}, T)).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // default address does not offer "Make default"
    expect(screen.queryByRole('button', { name: 'Make default' })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no addresses', async () => {
    server.use(http.get(`${BASE}/users/me/addresses`, () => ok([])));
    renderApp(<AddressesPage />, { as: 'buyer' });
    expect(await screen.findByText('No saved addresses', {}, T)).toBeInTheDocument();
  });

  it('offers "Make default" for non-default addresses and reports success', async () => {
    server.use(http.get(`${BASE}/users/me/addresses`, () => ok([address, { ...address, _id: 'a2', isDefault: false }])));
    let patched = false;
    server.use(
      http.patch(`${BASE}/users/me/addresses/:id`, () => {
        patched = true;
        return ok(address);
      }),
    );
    renderApp(<AddressesPage />, { as: 'buyer' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Make default' }, T));
    expect(await screen.findByText('Default address updated', {}, T)).toBeInTheDocument();
    expect(patched).toBe(true);
  });

  it('opens the add dialog from the header button', async () => {
    renderApp(<AddressesPage />, { as: 'buyer' });
    await screen.findByTestId('address-card', {}, T);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add address' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('deletes an address after confirmation', async () => {
    let deleted = false;
    server.use(
      http.delete(`${BASE}/users/me/addresses/:id`, () => {
        deleted = true;
        return ok(null);
      }),
    );
    renderApp(<AddressesPage />, { as: 'buyer' });
    await screen.findByTestId('address-card', {}, T);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete address?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Address deleted', {}, T)).toBeInTheDocument();
    expect(deleted).toBe(true);
  });

  it('keeps the address when the delete confirmation is cancelled', async () => {
    let deleted = false;
    server.use(
      http.delete(`${BASE}/users/me/addresses/:id`, () => {
        deleted = true;
        return ok(null);
      }),
    );
    renderApp(<AddressesPage />, { as: 'buyer' });
    await screen.findByTestId('address-card', {}, T);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleted).toBe(false);
    expect(screen.getByTestId('address-card')).toBeInTheDocument();
  });
});

describe('NotificationsPage', () => {
  it('renders notifications with a View link when one is provided', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () =>
        paged([
          {
            _id: 'n1',
            type: 'order',
            title: 'Order shipped',
            message: 'Your order shipped',
            read: false,
            link: '/account/orders/o1',
            createdAt: '2026-01-03T00:00:00Z',
          },
        ]),
      ),
    );
    renderApp(<NotificationsPage />, { as: 'buyer' });
    expect(await screen.findByText('Order shipped', {}, T)).toBeInTheDocument();
    expect(screen.getByText('Your order shipped')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/account/orders/o1');
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
  });

  it('hides "Mark read" for notifications that are already read', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () =>
        paged([{ _id: 'n2', type: 'system', title: 'Welcome', message: 'Hi', read: true, createdAt: '2026-01-03T00:00:00Z' }]),
      ),
    );
    renderApp(<NotificationsPage />, { as: 'buyer' });
    expect(await screen.findByText('Welcome', {}, T)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();
  });

  it('marks a single notification read and reloads the list', async () => {
    let marked = false;
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, () => {
        marked = true;
        return ok(null);
      }),
    );
    renderApp(<NotificationsPage />, { as: 'buyer' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Mark read' }, T));
    await waitFor(() => expect(marked).toBe(true));
  });

  it('marks all notifications as read', async () => {
    let all = false;
    server.use(
      http.post(`${BASE}/notifications/read-all`, () => {
        all = true;
        return ok(null);
      }),
    );
    renderApp(<NotificationsPage />, { as: 'buyer' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }, T));
    expect(await screen.findByText('All marked as read', {}, T)).toBeInTheDocument();
    expect(all).toBe(true);
  });

  it('shows an empty state when there are no notifications', async () => {
    server.use(http.get(`${BASE}/notifications`, () => paged([])));
    renderApp(<NotificationsPage />, { as: 'buyer' });
    expect(await screen.findByText("You're all caught up", {}, T)).toBeInTheDocument();
  });
});

describe('BecomeSellerPage', () => {
  it('shows the application form when the user has no application', async () => {
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    expect(await screen.findByRole('button', { name: 'Submit application' }, T)).toBeInTheDocument();
    expect(screen.queryByTestId('application-status')).not.toBeInTheDocument();
  });

  it('submits the application with contact information and reports success', async () => {
    let body: { businessName?: string; contactInformation?: { email?: string } } | undefined;
    server.use(
      http.post(`${BASE}/seller-applications`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return ok({ _id: 'app1', businessName: 'Biz', applicationStatus: 'pending' });
      }),
    );
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Business name', {}, T), 'Biz Co');
    await user.type(screen.getByLabelText('Business description'), 'We sell gadgets');
    const email = screen.getByLabelText('Contact email');
    await user.clear(email);
    await user.type(email, 'biz@example.com');
    await user.type(screen.getByLabelText('Contact phone'), '+1 555 0199');
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('Application submitted', {}, T)).toBeInTheDocument();
    expect(body?.businessName).toBe('Biz Co');
    expect(body?.contactInformation?.email).toBe('biz@example.com');
  });

  it('shows a pending application status without the form', async () => {
    server.use(
      http.get(`${BASE}/seller-applications/me`, () =>
        ok({ _id: 'app1', businessName: 'Biz Co', businessDescription: 'd', applicationStatus: 'pending' }),
      ),
    );
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    const status = await screen.findByTestId('application-status', {}, T);
    expect(status).toHaveTextContent('Biz Co');
    expect(status).toHaveTextContent(/pending/i);
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });

  it('shows reviewer notes and allows re-applying after a rejection', async () => {
    server.use(
      http.get(`${BASE}/seller-applications/me`, () =>
        ok({
          _id: 'app1',
          businessName: 'Biz Co',
          businessDescription: 'd',
          applicationStatus: 'rejected',
          reviewNotes: 'Missing tax details',
        }),
      ),
    );
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    const status = await screen.findByTestId('application-status', {}, T);
    expect(status).toHaveTextContent('Missing tax details');
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeInTheDocument();
  });

  it('offers a role refresh once an approved application is not yet reflected in roles', async () => {
    server.use(
      http.get(`${BASE}/seller-applications/me`, () =>
        ok({ _id: 'app1', businessName: 'Biz Co', businessDescription: 'd', applicationStatus: 'approved' }),
      ),
    );
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    expect(await screen.findByRole('button', { name: 'Refresh my roles' }, T)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });

  it('links sellers to the seller portal instead of the application form', async () => {
    renderApp(<BecomeSellerPage />, { as: 'seller' });
    const link = await screen.findByRole('link', { name: 'Go to seller portal' }, T);
    expect(link).toHaveAttribute('href', '/seller');
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });

  it('keeps the form hidden while the application lookup is failing', async () => {
    server.use(http.get(`${BASE}/seller-applications/me`, () => fail(500, 'Server down')));
    renderApp(<BecomeSellerPage />, { as: 'buyer' });
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument(), T);
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });
});
