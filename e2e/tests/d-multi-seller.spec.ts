import { expect, test } from '@playwright/test';
import { API, login } from './helpers';

test('D: one checkout with products from two sellers creates one order with two seller sub-orders', async ({ page, request }) => {
  const list = await (await request.get(`${API}/products?limit=40&inStock=true`)).json();
  const bySeller = new Map<string, { id: string; name: string }>();
  for (const p of list.data) if (p.stock > 5 && !bySeller.has(String(p.seller))) bySeller.set(String(p.seller), { id: p._id, name: p.name });
  const picks = [...bySeller.values()].slice(0, 2);
  expect(picks).toHaveLength(2);

  await login(page, 'dave@example.com');
  for (const p of picks) {
    await page.goto(`/products/${p.id}`);
    await page.getByRole('button', { name: /add to cart/i }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();
  }
  await page.goto('/cart');
  await page.getByRole('button', { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  if (await page.getByRole('radio', { name: /shipping/i }).count() === 0 && (await page.getByRole('radiogroup', { name: 'Shipping address' }).locator('input').count()) === 0) {
    await page.getByRole('button', { name: /add.*address/i }).first().click();
    await page.getByLabel('Recipient name').fill('Dave');
    await page.getByLabel('Phone').fill('+1 555 010 9999');
    await page.getByLabel('Address line 1').fill('2 Test Street');
    await page.getByLabel('City').fill('Toronto');
    await page.getByLabel('State').fill('ON');
    await page.getByLabel('Postal code').fill('M5V 2T6');
    await page.getByLabel('Country').fill('Canada');
    await page.getByRole('button', { name: /save address/i }).click();
  }
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible();
  await expect(page.getByTestId('seller-order')).toHaveCount(2);
});
