jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/refunds', () => {
  const actual = jest.requireActual('@/lib/refunds');
  return {
    ...actual,
    requestOrderRefund: jest
      .fn()
      .mockResolvedValue({
        id: 'TEST-refund',
        status: 'pending',
        amountCents: 500,
      }),
  };
});
import { getServerSession } from 'next-auth';
import { requestOrderRefund } from '@/lib/refunds';
import { POST } from '@/app/api/admin/refund/route';
const request = () =>
  new Request('https://store.invalid/api/admin/refund', {
    method: 'POST',
    body: JSON.stringify({
      orderId: 'TEST-order',
      requestId: '00000000-0000-4000-8000-000000000001',
      amountCents: 500,
    }),
  });
test('refund requires an authenticated administrator before touching the refund service', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { id: 'TEST-customer', role: 'customer' },
  });
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(requestOrderRefund).not.toHaveBeenCalled();
});
test('authenticated API passes the administrator identity directly without an internal HTTP request', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { id: 'TEST-admin', role: 'admin' },
  });
  const fetchSpy = jest.spyOn(global, 'fetch');
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(requestOrderRefund).toHaveBeenCalledWith(
    expect.objectContaining({ orderId: 'TEST-order', amountCents: 500 }),
    'TEST-admin',
  );
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
