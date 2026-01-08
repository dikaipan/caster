import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()} `));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err} `));
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login');

        // Check if we are on the login page
        await expect(page).toHaveTitle(/Cassette/i); // Assuming title contains Cassette based on branding

        // Fill credentials (using default seed data)
        await page.fill('input#username', 'admin');
        await page.fill('input#password', 'admin123');

        // Click sign in
        await page.click('button[type="submit"]');

        // Wait for navigation to dashboard
        // The dashboard is at / or /dashboard depending on implementation, 
        // but the code shows router.push(landingPage) where landingPage is usually /
        await expect(page).toHaveURL(/dashboard|$/);

        // Wait for loading to finish (longer timeout for CI)
        await expect(page.getByText('Loading dashboard...', { exact: false })).not.toBeVisible({ timeout: 15000 });

        // Verify dashboard content matches either Hitachi or Pengelola view
        await expect(page.locator('body')).toContainText(/Total Mesin|Total Kaset/);
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input#username', 'admin');
        await page.fill('input#password', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Expect error message (matches various common error responses)
        await expect(page.locator('body')).toContainText(/Login failed|Unauthorized|credentials/i);
    });

    test('should redirect to login if not authenticated', async ({ page }) => {
        await page.goto('/dashboard');
        // Should be redirected to /login
        await expect(page).toHaveURL(/login/);
    });
});
