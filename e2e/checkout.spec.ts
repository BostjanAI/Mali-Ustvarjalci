import { test, expect } from '@playwright/test';
test('demo cart persists and cannot start a real payment', async ({
  page,
  request,
}) => {
  await page.goto('/sl/shop');
  await page
    .getByRole('button', {
      name: 'Dodaj v košarico: Lesena lisička',
      exact: true,
    })
    .click();
  await page.goto('/sl/cart');
  await expect(
    page.getByRole('heading', { name: 'Lesena lisička', exact: true }),
  ).toBeVisible();
  await page.goto('/sl/checkout');
  await expect(
    page.getByRole('heading', {
      name: 'Raziskuješ predstavitveno trgovino',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Nadaljuj na varno plačilo',
      exact: true,
    }),
  ).toHaveCount(0);
  const response = await request.post('/api/stripe', { data: {} });
  expect(response.status()).toBe(409);
});
