import { z } from 'zod';
export const shippingServiceSchema = z.object({
  code: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  countries: z.array(z.enum(['SI', 'AT', 'DE', 'HR', 'IT'])).min(1),
  chargeCents: z.number().int().min(0).max(100000),
  paymentMethod: z
    .enum(['bank_transfer', 'bank_transfer_dropshipping'])
    .optional(),
});
export const shippingServicesSchema = z.array(shippingServiceSchema).max(10);
export type ShippingService = z.infer<typeof shippingServiceSchema>;
export function deliveryQuote(
  suppliers: Array<{
    id: string;
    active: boolean;
    orderForwardingEnabled: boolean;
    shippingServicesJson: string | null;
  }>,
  supplierIds: string[],
  country: string,
) {
  const bySupplier: Record<string, ShippingService> = {};
  let totalCents = 0;
  for (const id of new Set(supplierIds)) {
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier?.active || !supplier.orderForwardingEnabled)
      throw new Error('Supplier unavailable');
    const options = shippingServicesSchema.parse(
      JSON.parse(supplier.shippingServicesJson || '[]'),
    );
    const service = options.find((s) => s.countries.includes(country as 'SI'));
    if (!service)
      throw new Error('No confirmed delivery service for this destination');
    bySupplier[id] = service;
    totalCents += service.chargeCents;
  }
  return { currency: 'EUR' as const, totalCents, bySupplier };
}
