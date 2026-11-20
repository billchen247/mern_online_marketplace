import { expect, test } from '@playwright/test';
import { login, logout, register, uniqueEmail } from './helpers';

test('B: a user applies to sell, admin approves, the user gains the seller portal', async ({ page }) => {
  const email = uniqueEmail('applicant');
  await register(page, 'Newly Seller', email);
  await page.goto('/seller');
  await expect(page.getByText(/access denied/i)).toBeVisible(); // role guard (server also enforces)

  await page.goto('/account/become-seller');
  await page.getByLabel('Business name').fill('E2E Widgets Co');
  await page.getByLabel('Business description').fill('We sell handcrafted widgets for testing.');
  await page.getByLabel('Contact email').fill(email);
  await page.getByLabel('Contact phone').fill('+1 555 000 1111');
  await page.getByRole('button', { name: /submit application/i }).click();
  await expect(page.getByTestId('application-status')).toContainText(/pending/i);
  await logout(page);

  await login(page, 'admin@example.com');
  await page.goto('/admin/applications');
  const card = page.getByTestId('application-card').filter({ hasText: 'E2E Widgets Co' });
  await card.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Application approved')).toBeVisible();
  await logout(page);

  await login(page, email);
  await page.goto('/seller');
  await expect(page.getByRole('heading', { name: /seller dashboard/i })).toBeVisible();
});
