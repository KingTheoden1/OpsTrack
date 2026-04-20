import { test, expect } from '@playwright/test';

/**
 * Role-based UI tests — verifies that the correct controls are shown
 * (or hidden) for Admin, Supervisor and Viewer accounts.
 *
 * Prerequisite: the three accounts below must exist in the database.
 * Create them via the /register page or seed script before running.
 */

const ACCOUNTS = {
  admin: { email: 'admin@opstrack.test', password: 'admin_pass_2026' },
  supervisor: { email: 'supervisor@opstrack.test', password: 'sup_pass_2026' },
  viewer: { email: 'viewer@opstrack.test', password: 'viewer_pass_2026' },
};

async function loginAs(
  page: import('@playwright/test').Page,
  role: keyof typeof ACCOUNTS
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS[role].email);
  await page.getByLabel('Password').fill(ACCOUNTS[role].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Defect Log — role-based controls', () => {
  test('Admin sees the "+ New Defect" button', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/defects');
    await expect(page.getByText('+ New Defect')).toBeVisible();
  });

  test('Supervisor sees the "+ New Defect" button', async ({ page }) => {
    await loginAs(page, 'supervisor');
    await page.goto('/defects');
    await expect(page.getByText('+ New Defect')).toBeVisible();
  });

  test('Viewer does NOT see the "+ New Defect" button', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.goto('/defects');
    await expect(page.getByText('+ New Defect')).not.toBeVisible();
  });
});

test.describe('AI Analysis — role-based controls', () => {
  test('Admin sees the CSV Import section', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/ai');
    await expect(page.getByText('CSV Import')).toBeVisible();
  });

  test('Viewer does NOT see the CSV Import section', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.goto('/ai');
    await expect(page.getByText('CSV Import')).not.toBeVisible();
  });
});

test.describe('Layout — role badge', () => {
  test('sidebar shows correct role label for each account', async ({ page }) => {
    for (const role of ['admin', 'supervisor', 'viewer'] as const) {
      await loginAs(page, role);
      await expect(page.getByText(role)).toBeVisible();
    }
  });
});
