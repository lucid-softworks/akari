import { expect, test } from '@playwright/test';

test.describe('Not found screen', () => {
  test('provides navigation back to the home screen', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByText('This screen does not exist.')).toBeVisible();
    const backLink = page.getByRole('link', { name: 'Go to home screen!' });
    await expect(backLink).toBeVisible();

    await backLink.click();

    await expect(page.getByText('Sign in to Bluesky')).toBeVisible();
  });
});
