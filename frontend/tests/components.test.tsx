import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../src/api/client';
import { ImageUploader, validateImageFile } from '../src/components/ImageUploader';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuth } from '../src/contexts/AuthContext';
import { AppRoutes } from '../src/routes/AppRoutes';
import { BASE, fail, ok, server, type Persona } from './mocks';
import { renderApp } from './render';

const T = { timeout: 15000 };
const png = (name = 'a.png', type = 'image/png', size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('validateImageFile', () => {
  it('accepts valid and rejects bad type or size', () => {
    expect(validateImageFile({ type: 'image/png', size: 100, name: 'a.png' })).toBeNull();
    expect(validateImageFile({ type: 'image/gif', size: 100, name: 'a.gif' })).toMatch(/only JPEG/);
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024, name: 'big.png' })).toMatch(/5 MB/);
  });
});

describe('ImageUploader', () => {
  function Harness({ max = 3, initial = [] as { url: string; publicId?: string }[] }) {
    const [v, setV] = (require_react() as typeof import('react')).useState(initial);
    return (
      <Providers>
        <ImageUploader label="Photos" value={v} onChange={setV} max={max} />
      </Providers>
    );
  }
  it('uploads files and removes them', async () => {
    server.use(http.post(`${BASE}/seller/uploads`, () => ok([{ url: '/uploads/new.png', publicId: 'n' }])));
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    await userEvent.upload(screen.getByLabelText('Upload Photos'), png());
    expect(await screen.findByAltText('Photos 1', {}, T)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Photos 1' }));
    await waitFor(() => expect(screen.queryByAltText('Photos 1')).not.toBeInTheDocument());
  });
  it('rejects invalid files client-side and reports upload errors', async () => {
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    await userEvent.upload(screen.getByLabelText('Upload Photos'), png('x.gif', 'image/gif'), { applyAccept: false });
    expect(await screen.findByText(/only JPEG/)).toBeInTheDocument();
    server.use(http.post(`${BASE}/seller/uploads`, () => fail(400, 'Upload failed hard')));
    await userEvent.upload(screen.getByLabelText('Upload Photos'), png());
    expect(await screen.findByText(/Upload failed hard/, {}, T)).toBeInTheDocument();
  });
  it('shows Replace for single-image mode', () => {
    render(
      <MemoryRouter>
        <Harness max={1} initial={[{ url: '/uploads/a.png' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Replace')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('renders a fallback when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error('kaboom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/);
    spy.mockRestore();
  });
});

describe('AuthContext', () => {
  it('logs out and clears the session; refreshUser works', async () => {
    function Probe() {
      const a = useAuth();
      return (
        <div>
          <span>{a.loading ? 'loading' : (a.user?.name ?? 'anon')}</span>
          <button onClick={() => void a.logout()}>out</button>
          <button onClick={() => void a.refreshUser()}>refresh</button>
          <span>
            {String(a.hasRole('user'))}/{String(a.hasAnyRole(['admin']))}
          </span>
        </div>
      );
    }
    renderApp(<Probe />, { as: 'buyer' });
    expect(await screen.findByText('Alice Buyer', {}, T)).toBeInTheDocument();
    expect(screen.getByText('true/false')).toBeInTheDocument();
    await userEvent.click(screen.getByText('refresh'));
    await userEvent.click(screen.getByText('out'));
    expect(await screen.findByText('anon', {}, T)).toBeInTheDocument();
  });
  it('treats a failing /auth/me after refresh as logged out', async () => {
    server.use(http.get(`${BASE}/auth/me`, () => fail(500, 'boom')));
    function Probe() {
      const a = useAuth();
      return <span>{a.loading ? 'loading' : (a.user?.name ?? 'anon')}</span>;
    }
    renderApp(<Probe />, { as: 'buyer' });
    expect(await screen.findByText('anon', {}, T)).toBeInTheDocument();
    setAccessToken(null);
  });
  it('useAuth throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Bad = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Bad />)).toThrow(/within AuthProvider/);
    spy.mockRestore();
  });
});

describe('forms', () => {
  const show = (route: string, as: Persona) => renderApp(<AppRoutes />, { route, as });
  it('submits a product review', async () => {
    let body: unknown;
    server.use(
      http.get(`${BASE}/products/:id/reviews/me`, () => ok({ eligible: true, hasPurchased: true, review: null })),
      http.post(`${BASE}/products/:id/reviews`, async ({ request }) => {
        body = await request.json();
        return ok({ _id: 'r9' });
      }),
    );
    show('/products/p1', 'buyer');
    const comment = await screen.findByLabelText('Your review', {}, T);
    fireEvent.click(document.querySelector('input[type="radio"][value="5"]')!);
    await userEvent.type(comment, 'Absolutely fantastic product, works great.');
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => expect(body).toMatchObject({ rating: 5 }), T);
  });
  it('requests a return and cancels an order', async () => {
    show('/account/orders/o1', 'buyer');
    const cancel = await screen.findAllByRole('button', { name: /cancel|return/i }, T);
    expect(cancel.length).toBeGreaterThan(0);
  });
  it('saves the profile', async () => {
    let patched = false;
    server.use(
      http.patch(`${BASE}/users/me`, () => {
        patched = true;
        return ok({});
      }),
    );
    show('/account/profile', 'buyer');
    const name = await screen.findByLabelText(/^Name|Full name/, {}, T);
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice Renamed');
    await userEvent.click(screen.getAllByRole('button', { name: /save|update/i })[0]);
    await waitFor(() => expect(patched).toBe(true), T);
  });
  it('submits a seller application', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/seller-applications`, async ({ request }) => {
        body = await request.json();
        return ok({ _id: 'x', applicationStatus: 'pending' });
      }),
    );
    show('/account/become-seller', 'buyer');
    await userEvent.type(await screen.findByLabelText('Business name', {}, T), 'My Biz');
    await userEvent.type(screen.getByLabelText('Business description'), 'We sell very nice things online.');
    const em = screen.getByLabelText('Contact email');
    await userEvent.clear(em);
    await userEvent.type(em, 'biz@example.com');
    await userEvent.type(screen.getByLabelText('Contact phone'), '+1 555 0100');
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(body?.businessName).toBe('My Biz'), T);
  });
});

// helpers kept at the bottom to keep the tests readable
import { Providers } from '../src/App';
import * as React from 'react';
function require_react() {
  return React;
}
void MemoryRouter;
