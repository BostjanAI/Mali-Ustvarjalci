jest.mock('@/lib/prisma', () => ({ prisma: {} }));
import { ikonkaPayload } from '@/lib/ikonka';
import { supplierRequestSchema } from '@/lib/supplierOrderApi';
import { nextRetry } from '@/lib/supplierForward';
const request = supplierRequestSchema.parse({
  version: 1,
  orderId: 'TEST',
  contact: { email: 'buyer@example.invalid', phone: '+386000000' },
  shippingAddress: {
    name: 'TEST Buyer',
    firstName: 'TEST',
    lastName: 'Buyer',
    streetName: 'TEST street',
    streetNumber1: '1',
    line1: 'TEST street 1',
    city: 'TEST city',
    postalCode: '0000',
    country: 'SI',
    phone: '+386000000',
  },
  shippingService: {
    code: 'dpd_courier',
    paymentMethod: 'bank_transfer_dropshipping',
  },
  items: [{ supplierProductId: 'KX-TEST', quantity: 2 }],
});
test('Ikonka maps the actual shipping service, product code and ISO3 recipient and preserves externalId', () => {
  const body = ikonkaPayload(request, 'TEST-REFERENCE', true);
  expect(body).toMatchObject({
    externalId: 'TEST-REFERENCE',
    checkOnly: true,
    dropshipping: true,
    shippingMethod: 'dpd_courier',
    paymentMethod: 'bank_transfer_dropshipping',
    recipient: { country: 'SVN', streetNumber1: '1' },
    lines: [{ code: 'KX-TEST', quantity: 2 }],
  });
  expect(body).not.toHaveProperty('price');
  expect(ikonkaPayload(request, 'TEST-REFERENCE').externalId).toBe(
    body.externalId,
  );
});
test('Ikonka rejects unstructured addresses and services requiring an unimplemented own-carrier label flow', () => {
  expect(() =>
    ikonkaPayload(
      {
        ...request,
        shippingAddress: { ...request.shippingAddress, streetNumber1: '' },
      },
      'TEST',
    ),
  ).toThrow('structured-address');
  expect(() =>
    ikonkaPayload(
      {
        ...request,
        shippingService: { code: 'own_dpd', paymentMethod: 'bank_transfer' },
      },
      'TEST',
    ),
  ).toThrow('service-configuration');
});
test('retry delay grows, honours partner Retry-After and is capped', () => {
  expect(+nextRetry(1, 0, 0)).toBe(60000);
  expect(+nextRetry(3, 0, 0)).toBe(240000);
  expect(+nextRetry(1, 3600, 0)).toBe(3600000);
  expect(+nextRetry(20, 0, 0)).toBe(21600000);
});
