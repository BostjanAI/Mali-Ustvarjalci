jest.mock('@/lib/prisma', () => ({ prisma: {} }));
import { isSupplierSyncDue } from '@/lib/supplierSync';
test('15-minute sync is due only after the configured interval', () => {
  expect(isSupplierSyncDue(null, '@15min')).toBe(true);
  expect(isSupplierSyncDue(new Date(Date.now() - 10 * 60000), '@15min')).toBe(
    false,
  );
  expect(isSupplierSyncDue(new Date(Date.now() - 16 * 60000), '@15min')).toBe(
    true,
  );
});
