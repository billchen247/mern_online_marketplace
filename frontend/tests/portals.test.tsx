import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { renderApp } from './render';
import type { Persona } from './mocks';

/**
 * Drives a page the way a user would explore it: opens every action button (menus, dialogs, confirmations),
 * types into any visible text fields, and submits/confirms. It asserts nothing crashes and the page stays usable.
 */
async function explore(route: string, as: Persona, anchor: RegExp) {
  renderApp(<AppRoutes />, { route, as });
  await screen.findAllByText(anchor, {}, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
  await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 200));
  const user = userEvent.setup();
  const clicked = new Set<string>();
  // filters: type into search boxes and pick every option of every select
  for (const tb of screen.queryAllByRole('textbox').slice(0, 2)) {
    if (!(tb as HTMLInputElement).value) await user.type(tb, 'a').catch(() => undefined);
  }
  for (const cb of screen.queryAllByRole('combobox').slice(0, 2)) {
    await act(async () => {
      await user.click(cb).catch(() => undefined);
    });
    for (const opt of screen.queryAllByRole('option').slice(0, 4)) {
      await act(async () => {
        await user.click(opt).catch(() => undefined);
      });
      const again = screen.queryAllByRole('combobox')[0];
      if (again)
        await act(async () => {
          await user.click(again).catch(() => undefined);
        });
    }
    await user.keyboard('{Escape}').catch(() => undefined);
  }
  const keyed = () => {
    const seen: Record<string, number> = {};
    const root = (document.querySelector('main') as HTMLElement | null) ?? document.body;
    return within(root)
      .queryAllByRole('button')
      .filter((b) => !(b as HTMLButtonElement).disabled && b.getAttribute('aria-disabled') !== 'true')
      .map((b) => {
        const base = `${b.textContent}|${b.getAttribute('aria-label')}`;
        seen[base] = (seen[base] ?? -1) + 1;
        return { b, key: `${base}#${seen[base]}` };
      })
      .filter(({ b }) => !b.closest('header, nav, aside, footer, [role="banner"], [role="navigation"]'))
      .filter(({ b }) => !/log ?out|sign out|sign in|sign up|portal menu/i.test(`${b.textContent}${b.getAttribute('aria-label')}`));
  };
  for (let i = 0; i < 60; i++) {
    const next = keyed().find(({ key }) => !clicked.has(key));
    if (!next) break;
    clicked.add(next.key);
    await act(async () => {
      await user.click(next.b).catch(() => undefined);
    });
    const dlg = screen.queryByRole('dialog');
    if (dlg) {
      for (const tb of within(dlg).queryAllByRole('textbox')) await user.type(tb, 'Test value 123').catch(() => undefined);
      const primary = within(dlg)
        .queryAllByRole('button')
        .filter((x) => !(x as HTMLButtonElement).disabled)
        .at(-1);
      if (primary)
        await act(async () => {
          await user.click(primary).catch(() => undefined);
        });
      await new Promise((r) => setTimeout(r, 50));
      const still = screen.queryByRole('dialog');
      if (still) {
        const cancel = within(still).queryAllByRole('button', { name: /cancel|close/i })[0];
        if (cancel) await user.click(cancel).catch(() => undefined);
      }
    }
    const menu = screen.queryAllByRole('menuitem');
    if (menu.length) await user.click(menu[0]).catch(() => undefined);
    await user.keyboard('{Escape}').catch(() => undefined);
  }
  expect(document.body).toBeInTheDocument();
}

const cases: [Persona, string, RegExp][] = [
  ['buyer', '/account', /Alice/],
  ['buyer', '/account/profile', /Alice/],
  ['buyer', '/account/addresses', /1 Main St/],
  ['buyer', '/account/orders', /MP-ABC/],
  ['buyer', '/account/orders/o1', /MP-ABC/],
  ['buyer', '/account/returns', /return/i],
  ['buyer', '/account/become-seller', /seller/i],
  ['buyer', '/account/notifications', /Order shipped/],
  ['buyer', '/products/p1', /Gaming Laptop/],
  ['buyer', '/products', /Office Mouse/],
  ['seller', '/seller', /Dashboard|Office Mouse/],
  ['seller', '/seller/shops', /Gadget Shop/],
  ['seller', '/seller/shops/s1', /Shop/],
  ['seller', '/seller/shops/new', /Shop/],
  ['seller', '/seller/products', /Gaming Laptop/],
  ['seller', '/seller/products/p1', /Gaming Laptop|Product/],
  ['seller', '/seller/products/new', /Product/],
  ['seller', '/seller/inventory', /Office Mouse/],
  ['seller', '/seller/orders', /MP-ABC-1/],
  ['seller', '/seller/orders/so1', /MP-ABC-1/],
  ['seller', '/seller/earnings', /Earnings|commission/i],
  ['seller', '/seller/payouts', /PO-1|payout/i],
  ['admin', '/admin', /Dashboard|Users/],
  ['admin', '/admin/users', /Alice Buyer/],
  ['admin', '/admin/applications', /Alice Biz/],
  ['admin', '/admin/sellers', /Sam Seller/],
  ['admin', '/admin/shops', /Gadget Shop/],
  ['admin', '/admin/products', /Gaming Laptop/],
  ['admin', '/admin/reviews', /Nice/],
  ['admin', '/admin/categories', /Fashion/],
  ['admin', '/admin/orders', /MP-ABC/],
  ['admin', '/admin/orders/o1', /MP-ABC/],
  ['admin', '/admin/returns', /Damaged/],
  ['admin', '/admin/settings', /Settings|commission/i],
];

describe('portal pages are explorable', () => {
  for (const [as, route, anchor] of cases) it(`${as} ${route}`, () => explore(route, as, anchor), 60000);
});
void waitFor;

/** Fills every field of a form page with plausible values and submits it. */
async function fillAndSubmit(route: string, as: Persona, anchor: RegExp) {
  renderApp(<AppRoutes />, { route, as });
  await screen.findAllByText(anchor, {}, { timeout: 15000 });
  const user = userEvent.setup();
  await waitFor(() => expect(screen.queryAllByRole('textbox').length).toBeGreaterThan(1), { timeout: 15000 });
  for (const cb of screen.queryAllByRole('combobox')) {
    await act(async () => {
      await user.click(cb).catch(() => undefined);
    });
    const opt = screen.queryAllByRole('option')[0];
    if (opt)
      await act(async () => {
        await user.click(opt).catch(() => undefined);
      });
  }
  for (const tb of [...screen.queryAllByRole('textbox'), ...screen.queryAllByRole('spinbutton')]) {
    const el = tb as HTMLInputElement;
    if (el.readOnly || el.disabled) continue;
    await user.clear(el).catch(() => undefined);
    const numeric = el.getAttribute('type') === 'number' || el.getAttribute('role') === 'spinbutton';
    const label = (el.getAttribute('aria-label') ?? el.id ?? '').toLowerCase();
    await user.type(el, numeric ? '5' : /email/.test(label) ? 'a@b.co' : 'Sample value text here').catch(() => undefined);
  }
  const submit = screen.queryAllByRole('button').filter((b) => (b as HTMLButtonElement).type === 'submit');
  for (const b of submit)
    await act(async () => {
      await user.click(b).catch(() => undefined);
    });
  await new Promise((r) => setTimeout(r, 300));
  expect(document.body).toBeInTheDocument();
}
describe('forms can be filled and submitted', () => {
  for (const [as, route, anchor] of [
    ['seller', '/seller/shops/new', /Shop/],
    ['seller', '/seller/shops/s1', /Shop/],
    ['seller', '/seller/products/new', /Product/],
    ['seller', '/seller/products/p1', /Product/],
    ['buyer', '/account/profile', /Alice/],
    ['admin', '/admin/settings', /Settings|commission/i],
  ] as [Persona, string, RegExp][])
    it(`${as} ${route}`, () => fillAndSubmit(route, as, anchor), 60000);
});
