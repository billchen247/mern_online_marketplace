import { expect, test } from '@playwright/test';
import { register, uniqueEmail } from './helpers';

test('A: buyer registers, searches, adds to cart, checks out and sees the order', async ({ page }) => {
  await register(page, 'E2E Buyer', uniqueEmail('buyer'));
  await page.getByRole('banner').getByRole('textbox', { name: 'Search products' }).fill('laptop');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/search=laptop|q=laptop/);
  await page.getByRole('link', { name: /laptop/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByText('Added to cart')).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: /checkout/i })).toBeVisible();
  await page.getByRole('button', { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // first-time buyer must add an address
  await page.getByRole('button', { name: /add.*address/i }).first().click();
  await page.getByLabel('Recipient name').fill('E2E Buyer');
  await page.getByLabel('Phone').fill('+1 555 010 1234');
  await page.getByLabel('Address line 1').fill('1 Test Street');
  await page.getByLabel('City').fill('Toronto');
  await page.getByLabel('State').fill('ON');
  await page.getByLabel('Postal code').fill('M5V 2T6');
  await page.getByLabel('Country').fill('Canada');
  await page.getByRole('button', { name: /save address/i }).click();

  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page).toHaveURL(/\/account\/orders\//);
  await expect(page.getByText(/thank you|order placed|confirmed/i).first()).toBeVisible();
  await page.goto('/account/orders');
  await expect(page.getByText(/MP-/).first()).toBeVisible();
});
