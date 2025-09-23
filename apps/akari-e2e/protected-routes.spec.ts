import { expect, test } from '@playwright/test';

const signInHeading = 'Sign in to Bluesky';
const handlePlaceholder = 'username.bsky.social or @username';

const protectedRoutes = [
  '/',
  '/bookmarks',
  '/messages',
  '/messages/pending',
  '/messages/example-user',
  '/notifications',
  '/post/example-post',
  '/profile',
  '/profile/example-user',
  '/search',
  '/settings',
] as const;

test.describe('Protected routes require authentication', () => {
  for (const path of protectedRoutes) {
    test(`redirects ${path} to the sign in screen`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByText(signInHeading)).toBeVisible();
      await expect(page.getByPlaceholder(handlePlaceholder)).toBeVisible();
    });
  }
});
