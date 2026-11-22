jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/email', () => ({ sendShippingUpdate: jest.fn() }));
import { POST as supplierWebhook } from '@/app/api/supplier-webhook/route';

describe('supplier webhook', () => {
  it('rejects unauthorized', async () => {
    const req = new Request('http://localhost/api/supplier-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await supplierWebhook(req as any);
    expect(res.status).toBe(401);
  });
});
