import { test, expect } from '@playwright/test';
test('refund endpoint rejects an unauthenticated user', async ({ request }) => {
  const res = await request.post('/api/admin/refund', {
    data: {
      orderId: 'test-only',
      requestId: '00000000-0000-4000-8000-000000000001',
    },
  });
  expect(res.status()).toBe(401);
});
