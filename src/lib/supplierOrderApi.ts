import { z } from 'zod';
import { shippingAddressSchema } from './orderDelivery';
export function validOrderEndpoint(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.hash &&
      !u.search &&
      !/(^|\.)example\.(com|org|net)$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}
export const supplierRequestSchema = z.object({
  version: z.literal(1),
  orderId: z.string().min(1),
  contact: z.object({ email: z.string().email(), phone: z.string().min(1) }),
  shippingAddress: shippingAddressSchema,
  shippingService: z
    .object({ code: z.string().min(1), paymentMethod: z.string().optional() })
    .optional(),
  items: z
    .array(
      z.object({
        supplierProductId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(20),
});
export async function supplierResponseId(response: Response) {
  if (!response.body) throw new Error('Invalid supplier response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw new Error('Supplier response too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const id = data.id;
  if (typeof id !== 'string' && typeof id !== 'number')
    throw new Error('Missing supplier order ID');
  const parsed = z.string().trim().min(1).max(150).parse(String(id));
  return parsed;
}
