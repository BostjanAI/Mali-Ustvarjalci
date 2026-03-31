import { test, expect } from '@playwright/test';

test('search page lists products and paginates', async ({ page }) => {
  await page.goto('/sl/shop?q=a');
  await expect(page.getByText('Shop')).toBeVisible();
  await expect(page.locator('a:has-text("Next")')).toBeVisible();
});


