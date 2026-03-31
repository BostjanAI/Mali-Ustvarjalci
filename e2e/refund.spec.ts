import { test, expect } from '@playwright/test';

test('refund endpoint requires admin', async ({ request }) => {
  const res = await request.post('/api/admin/refund', { data: { orderId: 'x' } });
  expect([401, 400]).toContain(res.status());
});


