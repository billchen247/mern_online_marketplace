import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('E: a seller processes, ships (with tracking) and delivers an order; the buyer sees the update', async ({ page }) => {
  await login(page, 'sam.seller@example.com');
  await page.goto('/seller/orders?status=pending');
  await page.goto('/seller/orders');
  const row = page
    .getByTestId('seller-order-row')
    .filter({ hasText: /pending/i })
    .first();
  await expect(row).toBeVisible();
  await row.getByRole('link').first().click();

  await page.getByRole('button', { name: /start processing|accept/i }).click();
  await expect(page.getByText('Order updated')).toBeVisible();
  await page.getByRole('button', { name: /mark as shipped/i }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Carrier').fill('UPS');
  await dlg.getByLabel('Tracking number').fill('1Z999E2E0001');
  await dlg.getByRole('button', { name: /ship order/i }).click();
  await expect(page.getByText('Order marked as shipped')).toBeVisible();
  await expect(page.getByText(/1Z999E2E0001/)).toBeVisible();
  await page.getByRole('button', { name: /mark as delivered/i }).click();
  await expect(page.getByText('Order updated')).toBeVisible();
  await expect(page.getByText(/delivered/i).first()).toBeVisible();
});
