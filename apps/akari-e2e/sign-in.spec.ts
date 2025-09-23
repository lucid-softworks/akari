import { expect, test } from '@playwright/test';

test.describe('Authentication screen', () => {
  test('shows the sign in form for new visitors', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Sign in to Bluesky')).toBeVisible();
    await expect(page.getByPlaceholder('username.bsky.social or @username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your app password')).toBeVisible();
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });
});
