import { prisma } from '@/lib/prisma';
import { readShippingAddress } from './orderDelivery';
import {
  validOrderEndpoint,
  supplierRequestSchema,
  supplierResponseId,
} from './supplierOrderApi';
export async function refreshSupplierStatus(orderId: string) {
  const rows = await prisma.supplierDispatch.findMany({ where: { orderId } });
  if (!rows.length) return;
  const status = rows.some(
    (d) =>
      d.status === 'needs_review' ||
      ['cancelled', 'refunded'].includes(d.supplierStatus || ''),
  )
    ? 'needs_review'
    : rows.every((d) => d.status === 'sent')
      ? rows.every((d) => d.supplierStatus === 'shipped')
        ? 'shipped'
        : 'confirmed'
      : rows.some((d) => d.status === 'failed')
        ? 'failed'
        : 'pending';
  await prisma.order.updateMany({
    where: {
      id: orderId,
      OR: [{ supplierStatus: null }, { supplierStatus: { not: 'refunded' } }],
    },
    data: {
      supplierStatus: status,
      ...(rows.every((d) => d.status === 'sent')
        ? {
            forwardedToSupplierAt: new Date(
              Math.max(...rows.map((d) => d.sentAt?.getTime() || 0)),
            ),
          }
        : {}),
    },
  });
}
export async function forwardOrderToSupplier(orderId: string) {
  const result = { sent: 0, blocked: 0, retryable: false };
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    result.blocked++;
    return result;
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { dispatches: { include: { supplier: true } } },
  });
  if (
    !order ||
    order.status !== 'paid' ||
    order.supplierStatus === 'refunded' ||
    order.fulfillmentHold ||
    !order.stripeCheckoutSessionId ||
    !readShippingAddress(order.shippingAddressJson)
  ) {
    result.blocked++;
    return result;
  }
  if (
    order.dispatches.some((d) =>
      ['cancelled', 'refunded'].includes(d.supplierStatus || ''),
    )
  ) {
    result.blocked++;
    return result;
  }
  if (!order.dispatches.length) {
    result.blocked++;
    return result;
  }
  for (const dispatch of order.dispatches) {
    if (dispatch.status === 'sent') continue;
    if (dispatch.status === 'needs_review') {
      result.blocked++;
      continue;
    }
    const supplier = dispatch.supplier;
    if (
      !supplier.active ||
      !supplier.orderForwardingEnabled ||
      !supplier.apiUrl ||
      !validOrderEndpoint(supplier.apiUrl) ||
      !supplier.orderAuthToken
    ) {
      result.blocked++;
      await prisma.supplierDispatch.updateMany({
        where: { id: dispatch.id, status: { in: ['pending', 'failed'] } },
        data: { lastError: 'supplier-order-api-not-configured' },
      });
      continue;
    }
    if (dispatch.endpointUrl && dispatch.endpointUrl !== supplier.apiUrl) {
      result.blocked++;
      await prisma.supplierDispatch.updateMany({
        where: { id: dispatch.id, status: { in: ['pending', 'failed'] } },
        data: {
          status: 'needs_review',
          lastError: 'endpoint-changed-after-attempt',
        },
      });
      continue;
    }
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(dispatch.requestJson);
    } catch {
      snapshot = null;
    }
    const parsed = supplierRequestSchema.safeParse(snapshot);
    if (!parsed.success || parsed.data.orderId !== order.id) {
      result.blocked++;
      await prisma.supplierDispatch.updateMany({
        where: { id: dispatch.id, status: { in: ['pending', 'failed'] } },
        data: {
          status: 'needs_review',
          lastError: 'invalid-dispatch-snapshot',
        },
      });
      continue;
    }
    const attemptAt = new Date();
    const claim = await prisma.supplierDispatch.updateMany({
      where: {
        id: dispatch.id,
        OR: [
          { status: { in: ['pending', 'failed'] } },
          {
            status: 'sending',
            lastAttemptAt: { lt: new Date(attemptAt.getTime() - 120000) },
          },
        ],
      },
      data: {
        status: 'sending',
        lastAttemptAt: attemptAt,
        attempts: { increment: 1 },
        endpointUrl: supplier.apiUrl,
        lastError: null,
      },
    });
    if (claim.count !== 1) {
      result.retryable = true;
      continue;
    }
    let error = 'supplier-network-or-timeout';
    let retryable = true;
    try {
      const response = await fetch(supplier.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + supplier.orderAuthToken,
          'Idempotency-Key': dispatch.id,
        },
        body: JSON.stringify({ ...parsed.data, reference: dispatch.id }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        cache: 'no-store',
      });
      if (response.ok) {
        let id: string;
        try {
          id = await supplierResponseId(response);
        } catch {
          error = 'supplier-success-without-valid-order-id';
          retryable = false;
          throw new Error(error);
        }
        await prisma.supplierDispatch.updateMany({
          where: {
            id: dispatch.id,
            status: 'sending',
            lastAttemptAt: attemptAt,
          },
          data: {
            status: 'sent',
            supplierOrderId: id,
            supplierStatus: 'confirmed',
            sentAt: new Date(),
            lastError: null,
          },
        });
        result.sent++;
        continue;
      }
      error = 'supplier-http-' + response.status;
      retryable =
        response.status >= 500 || [408, 429].includes(response.status);
      await response.body?.cancel().catch(() => {});
    } catch {
      /* Never log addresses, tokens or raw supplier responses. */
    }
    await prisma.supplierDispatch.updateMany({
      where: { id: dispatch.id, status: 'sending', lastAttemptAt: attemptAt },
      data: { status: retryable ? 'failed' : 'needs_review', lastError: error },
    });
    if (retryable) result.retryable = true;
    else result.blocked++;
  }
  await refreshSupplierStatus(order.id);
  return result;
}
