import { enqueueTrackingNotification } from './trackingNotifications';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { supplierRequestSchema } from './supplierOrderApi';
const endpoint = 'https://orders-api.ikonka.eu/v1/orders';
export class SupplierApiError extends Error {
  constructor(
    public code: string,
    public retryable = false,
    public retryAfterSeconds = 60,
  ) {
    super(code);
  }
}
export function ikonkaPayload(
  request: z.infer<typeof supplierRequestSchema>,
  reference: string,
  checkOnly = false,
) {
  const a = request.shippingAddress;
  const iso3: Record<string, string> = {
    SI: 'SVN',
    AT: 'AUT',
    DE: 'DEU',
    HR: 'HRV',
    IT: 'ITA',
  };
  if (!a.firstName || !a.lastName || !a.streetName || !a.streetNumber1)
    throw new SupplierApiError('ikonka-structured-address-required');
  const service = request.shippingService;
  if (
    !service ||
    !['dpd_courier', 'gls_courier', 'inpost_courier', 'pallet_raben'].includes(
      service.code,
    ) ||
    !['bank_transfer', 'bank_transfer_dropshipping'].includes(
      service.paymentMethod || '',
    )
  )
    throw new SupplierApiError('ikonka-service-configuration-required');
  return {
    externalId: reference,
    lines: request.items.map((i) => ({
      code: i.supplierProductId,
      quantity: i.quantity,
    })),
    shippingMethod: service.code,
    paymentMethod: service.paymentMethod,
    currency: 'EUR',
    recipient: {
      firstName: a.firstName,
      lastName: a.lastName,
      street: a.streetName,
      streetNumber1: a.streetNumber1,
      ...(a.streetNumber2 ? { streetNumber2: a.streetNumber2 } : {}),
      postcode: a.postalCode,
      city: a.city,
      country: iso3[a.country],
      email: request.contact.email,
      phone: a.phone,
    },
    dropshipping: true,
    ...(checkOnly ? { checkOnly: true } : {}),
  };
}
export async function callIkonka(
  supplier: {
    id: string;
    apiUrl: string | null;
    orderApiUsername: string | null;
    orderAuthToken: string | null;
  },
  request: z.infer<typeof supplierRequestSchema>,
  reference: string,
  checkOnly = false,
) {
  if (
    supplier.apiUrl !== endpoint ||
    !supplier.orderApiUsername ||
    !supplier.orderAuthToken
  )
    throw new SupplierApiError('ikonka-credentials-or-endpoint-missing');
  const body = ikonkaPayload(request, reference, checkOnly);
  await reserveIkonkaSlot(supplier.id);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(
          supplier.orderApiUsername + ':' + supplier.orderAuthToken,
        ).toString('base64'),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
    cache: 'no-store',
  });
  const text = await response.text();
  if (text.length > 65536)
    throw new SupplierApiError('ikonka-response-too-large');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SupplierApiError('ikonka-invalid-response', true);
  }
  const retryAfter = Math.max(
    37,
    Math.min(86400, Number(response.headers.get('retry-after')) || 60),
  );
  if (
    response.status === 202 ||
    response.status === 409 ||
    response.status === 429 ||
    response.status >= 500
  )
    throw new SupplierApiError(
      'ikonka-retry-' + response.status,
      true,
      retryAfter,
    );
  if (!response.ok)
    throw new SupplierApiError('ikonka-rejected-' + response.status);
  if (checkOnly) {
    if (data.checkedOnly !== true || data.valid !== true)
      throw new SupplierApiError('ikonka-preflight-rejected');
    return { checkedOnly: true, id: null, status: 'checked' };
  }
  if (
    typeof data.orderNumber !== 'string' ||
    !data.orderNumber.trim() ||
    data.externalId !== reference
  )
    throw new SupplierApiError('ikonka-order-identity-unconfirmed');
  return {
    checkedOnly: false,
    id: data.orderNumber,
    status: typeof data.status === 'string' ? data.status : 'unknown',
  };
}

export async function reserveIkonkaSlot(supplierId: string) {
  const now = new Date();
  const slot = await prisma.supplier.updateMany({
    where: {
      id: supplierId,
      OR: [{ orderApiNextAt: null }, { orderApiNextAt: { lte: now } }],
    },
    data: { orderApiNextAt: new Date(now.getTime() + 37000) },
  });
  if (!slot.count)
    throw new SupplierApiError('ikonka-account-rate-limit', true, 37);
}
async function readIkonka(
  supplier: {
    id: string;
    apiUrl: string | null;
    orderApiUsername: string | null;
    orderAuthToken: string | null;
  },
  route: string,
) {
  if (
    supplier.apiUrl !== 'https://orders-api.ikonka.eu/v1/orders' ||
    !supplier.orderApiUsername ||
    !supplier.orderAuthToken
  )
    throw new SupplierApiError('ikonka-credentials-or-endpoint-missing');
  await reserveIkonkaSlot(supplier.id);
  const r = await fetch('https://orders-api.ikonka.eu' + route, {
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          supplier.orderApiUsername + ':' + supplier.orderAuthToken,
        ).toString('base64'),
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
    cache: 'no-store',
  });
  if (!r.ok)
    throw new SupplierApiError(
      'ikonka-read-' + r.status,
      r.status === 429 || r.status >= 500,
    );
  const text = await r.text();
  if (text.length > 262144)
    throw new SupplierApiError('ikonka-response-too-large');
  return JSON.parse(text);
}
export async function ikonkaCatalog(
  supplier: {
    id: string;
    apiUrl: string | null;
    orderApiUsername: string | null;
    orderAuthToken: string | null;
  },
  country = 'SVN',
) {
  if (!/^[A-Z]{3}$/.test(country)) throw new Error('ISO3 country required');
  return readIkonka(
    supplier,
    '/v1/catalog?country=' + country + '&dropshipping=1',
  );
}
export async function pollIkonkaTracking() {
  const suppliers = await prisma.supplier.findMany({
    where: {
      orderAdapter: 'ikonka',
      active: true,
      orderForwardingEnabled: true,
    },
    take: 2,
  });
  let updated = 0;
  for (const supplier of suppliers) {
    const rows = await prisma.supplierDispatch.findMany({
      where: {
        supplierId: supplier.id,
        status: 'sent',
        supplierOrderId: { not: null },
        trackingNumber: null,
      },
      take: 100,
    });
    if (!rows.length) continue;
    try {
      const data = await readIkonka(
        supplier,
        '/v1/orders/tracking?' +
          new URLSearchParams({ externalIds: rows.map((r) => r.id).join(',') }),
      );
      const parsed = z
        .object({
          orders: z.array(
            z.object({
              orderNumber: z.string(),
              externalId: z.string().nullable(),
              trackingNumber: z.string().max(200).nullable(),
            }),
          ),
        })
        .parse(data);
      for (const order of parsed.orders) {
        const row = rows.find(
          (r) =>
            r.id === order.externalId &&
            r.supplierOrderId === order.orderNumber,
        );
        if (row && order.trackingNumber) {
          const result = await prisma.$transaction(async (tx) => {
            const result = await tx.supplierDispatch.updateMany({
              where: { id: row.id, trackingNumber: null },
              data: { trackingNumber: order.trackingNumber },
            });
            if (result.count)
              await enqueueTrackingNotification(
                tx,
                row.id,
                order.trackingNumber!,
              );
            return result;
          });
          updated += result.count;
        }
      }
    } catch (error) {
      if (error instanceof SupplierApiError && error.retryable) continue;
      await prisma.operationsAlert.upsert({
        where: { key: 'ikonka-tracking:' + supplier.id },
        create: {
          key: 'ikonka-tracking:' + supplier.id,
          code: 'ikonka-tracking-needs-review',
        },
        update: {},
      });
    }
  }
  return updated;
}
