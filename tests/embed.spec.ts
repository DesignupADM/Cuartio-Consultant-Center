import { test, expect } from '@playwright/test';

test.describe('Embeddable registration form', () => {
  test('renders the full registration form', async ({ page }) => {
    await page.goto('/embed/register');

    await expect(
      page.getByRole('heading', { name: 'Create your consultant account' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel('First Name', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Last Name', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register as Consultant' })).toBeEnabled();
  });

  test('can be framed by a third-party page', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL as string;
    await page.setContent(
      `<!doctype html><html><body style="margin:0">
        <iframe id="curatio-registration" src="${baseURL}/embed/register" style="width:640px;height:1200px;border:0"></iframe>
      </body></html>`
    );

    const frame = page.frameLocator('#curatio-registration');
    await expect(
      frame.getByRole('heading', { name: 'Create your consultant account' })
    ).toBeVisible({ timeout: 20000 });
  });

  test('defaults to the light theme and left alignment', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/embed/register');

    await expect(
      page.getByRole('heading', { name: 'Create your consultant account' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('[data-embed-align]')).toHaveAttribute('data-embed-align', 'left');
    await expect(page.locator('[data-embed-align]')).toHaveClass(/mr-auto/);
  });

  test('honors the align query parameter', async ({ page }) => {
    await page.goto('/embed/register?align=center');

    await expect(
      page.getByRole('heading', { name: 'Create your consultant account' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-embed-align]')).toHaveAttribute('data-embed-align', 'center');
    await expect(page.locator('[data-embed-align]')).toHaveClass(/mx-auto/);
  });

  test('honors the dark theme query parameter', async ({ page }) => {
    await page.goto('/embed/register?theme=dark');

    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 20000 });
  });

  test('preview mode disables submissions', async ({ page }) => {
    await page.goto('/embed/register?preview=1');

    await expect(page.getByText(/Preview mode/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Register as Consultant' })).toBeDisabled();
  });
});
