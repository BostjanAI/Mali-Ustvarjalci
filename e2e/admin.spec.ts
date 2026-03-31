import { test, expect } from '@playwright/test';

test('search endpoint returns results', async ({ request }) => {
  const res = await request.get('/api/search?q=test');
  expect(res.ok()).toBeTruthy();
});

test('admin sync-now unauthorized without creds', async ({ request }) => {
  const res = await request.post('/api/admin/sync-now');
  expect([401, 400]).toContain(res.status());
});


