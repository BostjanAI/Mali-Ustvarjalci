import { test, expect } from '@playwright/test';
test('search and category filter return the expected product', async ({
  page,
}) => {
  await page.goto('/sl/shop?q=lisicka');
  await expect(
    page.getByRole('heading', { name: 'Lesena lisička', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Izdelki' }).getByRole('article'),
  ).toHaveCount(1);
  await page
    .getByRole('radio', { name: 'Risanje in slikanje', exact: true })
    .click();
  await expect(
    page.getByRole('radio', { name: 'Risanje in slikanje', exact: true }),
  ).toBeChecked();
  await expect(page).toHaveURL(/category=art-craft/);
  await expect(
    page.getByRole('region', { name: 'Izdelki' }).getByRole('article'),
  ).toHaveCount(0);
});
