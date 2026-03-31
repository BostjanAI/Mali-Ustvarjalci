import { forwardOrderToSupplier } from '@/lib/supplierForward';

describe('forwardOrderToSupplier', () => {
  it('does not throw if SUPPLIER_ORDER_URL is missing', async () => {
    await expect(forwardOrderToSupplier('non-existent-order')).resolves.toBeUndefined();
  });
});


