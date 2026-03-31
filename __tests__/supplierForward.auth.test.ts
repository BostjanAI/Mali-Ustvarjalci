import { forwardOrderToSupplier } from '@/lib/supplierForward';

describe('supplier forward uses API key', () => {
  const origFetch = global.fetch as any;
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({ id: 'SUP-1' }) }));
  });
  afterEach(() => {
    (global as any).fetch = origFetch;
  });

  it('adds Authorization header', async () => {
    process.env.SUPPLIER_ORDER_URL = 'https://example.com/order';
    process.env.SUPPLIER_API_KEY = 'test-key';
    await expect(forwardOrderToSupplier('nonexistent')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalled();
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init.headers as any).Authorization).toMatch(/Bearer test-key/);
  });
});


