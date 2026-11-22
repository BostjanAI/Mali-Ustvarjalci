jest.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: jest.fn() } },
}));
import { prisma } from '@/lib/prisma';
import { forwardOrderToSupplier } from '@/lib/supplierForward';
test('a global API key cannot bypass missing per-supplier configuration', async () => {
  process.env.SUPPLIER_ORDER_URL = 'https://vendor.invalid/orders';
  process.env.SUPPLIER_API_KEY = 'TEST-ONLY';
  (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
  const fetchSpy = jest.spyOn(global, 'fetch');
  await forwardOrderToSupplier('missing');
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
