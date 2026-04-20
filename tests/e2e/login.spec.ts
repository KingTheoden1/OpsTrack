import { test, expect } from '@playwright/test';

/**
 * Login flow — E2E happy path and error states.
 *
 * These tests require the full stack to be running.
 * Run locally with: pnpm test:e2e
 * The base URL defaults to http://localhost:5173 (set E2E_BASE_URL to override).
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByText('OpsTrack')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@ops.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('navigates to /register when the Register link is clicked', async ({ page }) => {
    await page.getByText('Register').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('redirects unauthenticated users to /login from a protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
