jest.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: jest.fn().mockResolvedValue(null) } },
}));
import { forwardOrderToSupplier } from '@/lib/supplierForward';
test('nonexistent order is blocked without a supplier request', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  await expect(forwardOrderToSupplier('missing')).resolves.toEqual({
    sent: 0,
    blocked: 1,
    retryable: false,
  });
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
