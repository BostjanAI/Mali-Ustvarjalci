import { test, expect } from '@playwright/test';

test('home renders', async ({ page }) => {
  await page.goto('/sl');
  await expect(page.getByText('Mali Ustvarjalci')).toBeVisible();
});





