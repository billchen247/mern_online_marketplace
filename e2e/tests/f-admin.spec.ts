import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('F: admin reviews dashboard, manages categories, blocks a product and updates settings', async ({ page }) => {
  await login(page, 'admin@example.com');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

  await page.goto('/admin/categories');
  await page.getByRole('button', { name: /add category/i }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('E2E Category');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Category created')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'E2E Category' })).toBeVisible();

  await page.goto('/admin/products');
  const first = page.getByRole('row').nth(1);
  await first.getByRole('button', { name: 'Block' }).click();
  await expect(page.getByText('Product updated')).toBeVisible();
  await expect(page.getByRole('row').nth(1)).toContainText(/blocked/i);

  await page.goto('/admin/settings');
  await page.getByLabel(/commission rate/i).fill('12');
  await page.getByRole('button', { name: /save settings/i }).click();
  await expect(page.getByText('Settings saved')).toBeVisible();

  await page.goto('/admin/users');
  await expect(page.getByTestId('user-row').first()).toBeVisible();
  await page.goto('/admin/returns');
  await expect(page.getByRole('heading', { name: /returns/i })).toBeVisible();
});

test('F2: role boundaries — a plain buyer is blocked from admin and seller areas', async ({ page }) => {
  await login(page, 'alice@example.com');
  await page.goto('/admin');
  await expect(page.getByText(/access denied/i)).toBeVisible();
  await page.goto('/seller');
  await expect(page.getByText(/access denied/i)).toBeVisible();
});
