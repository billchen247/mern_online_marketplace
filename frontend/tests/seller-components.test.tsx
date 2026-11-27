import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { BASE, ok, product, sellerOrder, server } from './mocks';
import { renderApp } from './render';

describe('seller order detail', () => {
  it('marks an order as shipped using the tracking dialog', async () => {
    let submitted: unknown;
    server.use(
      http.get(`${BASE}/seller/orders/:id`, () => ok({ ...sellerOrder, allowedTransitions: ['shipped'] })),
      http.patch(`${BASE}/seller/orders/:id/status`, async ({ request }) => {
        submitted = await request.json();
        return ok(sellerOrder);
      }),
    );

    renderApp(<AppRoutes />, { route: '/seller/orders/so1', as: 'seller' });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as shipped' }, { timeout: 15000 }));
    await userEvent.type(screen.getByLabelText('Carrier'), 'ParcelCo');
    await userEvent.type(screen.getByLabelText('Tracking number'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Ship order' }));

    await waitFor(() => expect(submitted).toMatchObject({ status: 'shipped', carrier: 'ParcelCo', trackingNumber: 'ABC123' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  describe('seller inventory', () => {
    it('submits a stock adjustment through the extracted stock dialog', async () => {
      let submitted: unknown;
      server.use(
        http.patch(`${BASE}/seller/products/:id/stock`, async ({ request }) => {
          submitted = await request.json();
          return ok(product);
        }),
      );

      renderApp(<AppRoutes />, { route: '/seller/inventory', as: 'seller' });
      const buttons = await screen.findAllByRole('button', { name: 'Adjust stock' }, { timeout: 15000 });
      await userEvent.click(buttons[0]);
      await userEvent.type(screen.getByLabelText('Amount'), '3');
      await userEvent.type(screen.getByLabelText('Note'), 'Restock');
      await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => expect(submitted).toMatchObject({ adjustment: 3, note: 'Restock' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  it('updates tracking through the extracted tracking dialog', async () => {
    let submitted: unknown;
    server.use(
      http.get(`${BASE}/seller/orders/:id`, () => ok({ ...sellerOrder, fulfillmentStatus: 'shipped', allowedTransitions: ['delivered'] })),
      http.patch(`${BASE}/seller/orders/:id/tracking`, async ({ request }) => {
        submitted = await request.json();
        return ok(sellerOrder);
      }),
    );

    renderApp(<AppRoutes />, { route: '/seller/orders/so1', as: 'seller' });
    await userEvent.click(await screen.findByRole('button', { name: 'Update tracking' }, { timeout: 15000 }));
    await userEvent.type(screen.getByLabelText('Carrier'), 'ParcelCo');
    await userEvent.type(screen.getByLabelText('Tracking number'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Save tracking' }));

    await waitFor(() => expect(submitted).toMatchObject({ carrier: 'ParcelCo', trackingNumber: 'ABC123' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
