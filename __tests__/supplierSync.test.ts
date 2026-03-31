import { runSupplierSync } from '@/lib/supplierSync';

describe('runSupplierSync', () => {
  it('runs without throwing when no env is set (demo mode)', async () => {
    const result = await runSupplierSync();
    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('updated');
    expect(result).toHaveProperty('deactivated');
    expect(result).toHaveProperty('errors');
  });
});


