import { test, expect } from '@playwright/test';
test('Slovenian home offers catalogue navigation', async ({ page }) => {
  await page.goto('/sl');
  await expect(
    page.getByRole('link', { name: 'Mali Ustvarjalci', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Glavna navigacija' })
      .getByRole('link', { name: 'Vsi izdelki', exact: true }),
  ).toBeVisible();
});
