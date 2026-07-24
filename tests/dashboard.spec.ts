import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock user info into localStorage before navigating
    await page.addInitScript(() => {
      window.localStorage.setItem('mockRole', 'admin');
    });
  });

  test('Admin dashboard loads successfully', async ({ page }) => {
    // We add the env var NEXT_PUBLIC_E2E_TEST=true when running playwright
    await page.goto('/dashboard');
    console.log("Current URL:", page.url());
    const content = await page.content();
    if (content.includes('Login')) console.log("Redirected to login!");
    else console.log("Did not redirect to login.");

    // It should not redirect to /login because of our auth mock
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify admin overview mounts
    await expect(page.getByText('Foundation Overview')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Analytics
    await page.getByRole('link', { name: 'Analytics Hub', exact: true }).first().click({ force: true });
    await expect(page).toHaveURL(/.*\/dashboard\/analytics/);
    await expect(page.getByText('Analytics Hub').first()).toBeVisible();

    // Navigate to Opportunities
    await page.getByRole('link', { name: 'Opportunities', exact: true }).first().click({ force: true });
    await expect(page).toHaveURL(/.*\/dashboard\/opportunities/);
    await expect(page.getByText('Foundation Projects').first()).toBeVisible();
    
    // Navigate to Directory
    await page.getByRole('link', { name: 'Consultant Directory', exact: true }).first().click({ force: true });
    await expect(page).toHaveURL(/.*\/dashboard\/directory/, { timeout: 10000 });
    await expect(page.getByText('Consultant Directory').first()).toBeVisible();
  });

  test('Consultant dashboard loads successfully', async ({ page }) => {
    // Override the mockRole for this test
    await page.addInitScript(() => {
      window.localStorage.setItem('mockRole', 'consultant');
    });

    await page.goto('/dashboard');

    // It should not redirect to /login
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verify consultant overview mounts
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 });
    
    // Admin links should not be visible
    await expect(page.getByRole('link', { name: 'Analytics Hub' })).not.toBeVisible();
    
    // Navigate to Consultant Profile
    await page.getByRole('link', { name: 'Consultant Profile' }).first().click();
    await expect(page).toHaveURL(/.*\/dashboard\/profile/);
    await expect(page.getByRole('heading', { name: 'My Profile' }).first()).toBeVisible();
  });
});
