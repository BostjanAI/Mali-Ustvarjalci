jest.mock('@/lib/prisma', () => ({
  prisma: { supplier: { findMany: jest.fn().mockResolvedValue([]) } },
}));
import { runSupplierSync } from '@/lib/supplierSync';
test('a missing supplier configuration is rejected without inventing demo products', async () => {
  delete process.env.SUPPLIER_NAME;
  delete process.env.SUPPLIER_FEED_URL;
  await expect(runSupplierSync()).rejects.toThrow('Configure a supplier');
});
