import { z } from 'zod';
export const deliveryCountries = ['SI', 'AT', 'DE', 'HR', 'IT'] as const;
export const shippingAddressSchema = z.object({
  firstName: z.string().max(100).default(''),
  lastName: z.string().max(100).default(''),
  streetName: z.string().max(200).default(''),
  streetNumber1: z.string().max(30).default(''),
  streetNumber2: z.string().max(100).default(''),
  name: z.string().trim().min(1).max(200),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  state: z.string().trim().max(100).default(''),
  country: z.enum(deliveryCountries),
  phone: z.string().trim().min(1).max(30),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
type DeliverySession = {
  shipping_details?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      postal_code?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  } | null;
  customer_details?: { phone?: string | null } | null;
  metadata?: Record<string, string> | null;
};
export function sessionShippingAddress(
  session: DeliverySession,
): ShippingAddress | null {
  const m = session.metadata || {};
  const shipping = session.shipping_details;
  const candidate = shipping
    ? {
        name: shipping.name,
        line1: shipping.address?.line1,
        line2: shipping.address?.line2 || '',
        city: shipping.address?.city,
        postalCode: shipping.address?.postal_code,
        state: shipping.address?.state || '',
        country: shipping.address?.country,
        phone: session.customer_details?.phone || m.phone,
      }
    : {
        name: [m.firstName, m.lastName].filter(Boolean).join(' '),
        line1: m.street,
        line2: m.addressLine2 || '',
        city: m.city,
        postalCode: m.postalCode,
        state: m.state || '',
        country: m.country,
        phone: m.phone,
      };
  const sameAddress = !shipping || candidate.line1 === m.street;
  Object.assign(candidate, {
    firstName: sameAddress ? m.firstName || '' : '',
    lastName: sameAddress ? m.lastName || '' : '',
    streetName: sameAddress ? m.streetName || '' : '',
    streetNumber1: sameAddress ? m.streetNumber1 || '' : '',
    streetNumber2: sameAddress ? m.addressLine2 || '' : '',
  });
  const parsed = shippingAddressSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
export function readShippingAddress(json?: string | null) {
  try {
    return shippingAddressSchema.parse(json ? JSON.parse(json) : null);
  } catch {
    return null;
  }
}
export const paidCartSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(150),
      title: z.string().min(1).max(500),
      priceCents: z.number().int().positive(),
      quantity: z.number().int().min(1).max(99),
      supplierId: z.string().min(1).max(150).nullable().optional(),
      supplierProductId: z.string().min(1).max(150).nullable().optional(),
    }),
  )
  .min(1)
  .max(20)
  .refine(
    (items) => new Set(items.map((i) => i.id)).size === items.length,
    'Duplicate products',
  );
export function supplierPayload(
  orderId: string,
  email: string,
  address: ShippingAddress,
  items: Array<{ supplierProductId: string | null; quantity: number }>,
) {
  if (items.some((i) => !i.supplierProductId))
    throw new Error('Supplier product reference missing');
  return {
    version: 1 as const,
    orderId,
    contact: { email, phone: address.phone },
    shippingAddress: address,
    items: items.map((i) => ({
      supplierProductId: i.supplierProductId!,
      quantity: i.quantity,
    })),
  };
}
export function settledCheckout(session: {
  mode?: string | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
}) {
  return (
    session.mode === 'payment' &&
    session.status === 'complete' &&
    session.currency === 'eur' &&
    (session.payment_status === 'paid' ||
      (session.payment_status === 'no_payment_required' &&
        session.amount_total === 0))
  );
}
