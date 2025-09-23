import { expect, test } from '@playwright/test';

test.describe('Debug screen', () => {
  test('shows query cache controls and empty state', async ({ page }) => {
    await page.goto('/debug');

    await expect(page.getByText('Query Cache Debug')).toBeVisible();
    await expect(page.getByText('Invalidate All')).toBeVisible();
    await expect(page.getByText('Clear All')).toBeVisible();
    await expect(page.getByText(/Total Queries:/)).toBeVisible();
    await expect(page.getByText('No queries in cache')).toBeVisible();
  });
});
