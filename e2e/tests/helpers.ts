import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Password123!';
export const API = 'http://localhost:5055/api/v1';

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.getByRole('banner').getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /log ?out|sign out/i }).click();
}

export async function register(page: Page, name: string, email: string) {
  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).not.toHaveURL(/\/register/);
}

export const uniqueEmail = (p: string) => `${p}.${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.test`;
