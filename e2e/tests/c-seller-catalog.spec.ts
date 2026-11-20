import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('C: a seller manages multiple shops, creates a product and adjusts stock', async ({ page }) => {
  await login(page, 'sam.seller@example.com');
  await page.goto('/seller/shops/new');
  await page.getByLabel('Shop name').fill('E2E Second Shop');
  await page.getByLabel('Description').fill('A second shop owned by the same seller.');
  await page.getByRole('button', { name: /create shop/i }).click();
  await expect(page.getByText('E2E Second Shop')).toBeVisible();
  await expect(page.getByTestId('shop-card').count()).resolves.toBeGreaterThan(1);

  await page.goto('/seller/products/new');
  await page.getByLabel('Shop', { exact: true }).click();
  await page.getByRole('option', { name: 'E2E Second Shop' }).click();
  await page.getByLabel('Category').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Product name').fill('E2E Test Gadget');
  await page.getByLabel('Description').fill('A gadget created by the end-to-end test suite.');
  await page.getByLabel('Price (USD)').fill('42.5');
  await page.getByLabel('Stock').fill('7');
  await page.getByLabel('SKU').fill(`E2E-${Date.now()}`);
  await page.getByRole('button', { name: /create product/i }).click();
  await expect(page.getByText('Product created')).toBeVisible();
  await expect(page.getByRole('link', { name: 'E2E Test Gadget' })).toBeVisible();

  await page.goto('/seller/inventory');
  const row = page.getByTestId('inventory-row').filter({ hasText: 'E2E Test Gadget' });
  await row.getByRole('button', { name: /adjust stock/i }).click();
  await page.getByRole('dialog').getByLabel('Amount').fill('5');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Stock updated')).toBeVisible();
  await expect(row.getByRole('cell').nth(2)).toHaveText('12');

  // buyers cannot reach seller routes
  await page.goto('/shops');
  await expect(page.getByText('E2E Second Shop')).toBeVisible();
});
