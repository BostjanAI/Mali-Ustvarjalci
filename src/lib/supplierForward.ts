import { prisma } from '@/lib/prisma';
import { readShippingAddress } from './orderDelivery';
import {
  validOrderEndpoint,
  supplierRequestSchema,
  supplierResponseId,
} from './supplierOrderApi';
import { callIkonka, SupplierApiError } from './ikonka';
export async function refreshSupplierStatus(orderId: string) {
  const rows = await prisma.supplierDispatch.findMany({ where: { orderId } });
  if (!rows.length) return;
  const status = rows.some(
    (d) =>
      d.status === 'needs_review' ||
      ['cancelled', 'refunded'].includes(d.supplierStatus || ''),
  )
    ? 'needs_review'
    : rows.some((d) => d.supplierStatus === 'awaiting_payment')
      ? 'awaiting_supplier_payment'
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
export function nextRetry(
  attempt: number,
  minimumSeconds = 0,
  now = Date.now(),
) {
  return new Date(
    now +
      Math.max(
        minimumSeconds,
        Math.min(21600, 60 * 2 ** Math.max(0, attempt - 1)),
      ) *
        1000,
  );
}
export async function forwardOrderToSupplier(
  orderId: string,
  options: { dispatchId?: string; force?: boolean } = {},
) {
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
    !readShippingAddress(order.shippingAddressJson) ||
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
    if (options.dispatchId && options.dispatchId !== dispatch.id) continue;
    if (dispatch.status === 'sent') continue;
    if (
      dispatch.status === 'needs_review' ||
      (!options.force &&
        dispatch.nextAttemptAt &&
        dispatch.nextAttemptAt.getTime() > Date.now())
    ) {
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
        data: {
          lastError: 'supplier-order-api-not-configured',
          nextAttemptAt: nextRetry(1, 3600),
        },
      });
      await prisma.operationsAlert.upsert({
        where: { key: 'supplier-config:' + supplier.id },
        create: {
          key: 'supplier-config:' + supplier.id,
          code: 'supplier-order-api-not-configured',
          orderId: order.id,
          dispatchId: dispatch.id,
        },
        update: {},
      });
      continue;
    }
    if (dispatch.endpointUrl && dispatch.endpointUrl !== supplier.apiUrl) {
      result.blocked++;
      await prisma.supplierDispatch.updateMany({
        where: {
          id: dispatch.id,
          status: { in: ['pending', 'failed', 'sending'] },
        },
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
        where: {
          id: dispatch.id,
          status: { in: ['pending', 'failed', 'sending'] },
        },
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
        ...(!options.force ? { nextAttemptAt: { lte: attemptAt } } : {}),
      },
      data: {
        status: 'sending',
        lastAttemptAt: attemptAt,
        attempts: { increment: 1 },
        endpointUrl: supplier.apiUrl,
        lastError: null,
      },
    });
    if (!claim.count) {
      result.retryable = true;
      continue;
    }
    let code = 'supplier-network-or-timeout';
    let retryable = true;
    let retryAfter = 0;
    try {
      let id: string;
      let status = 'confirmed';
      if (supplier.orderAdapter === 'ikonka') {
        const accepted = await callIkonka(supplier, parsed.data, dispatch.id);
        if (!accepted.id)
          throw new SupplierApiError('ikonka-missing-order-number');
        id = accepted.id;
        status =
          accepted.status === 'awaiting_payment'
            ? 'awaiting_payment'
            : accepted.status === 'cancelled'
              ? 'cancelled'
              : 'confirmed';
      } else {
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
        if (!response.ok) {
          const wait = Number(response.headers.get('retry-after')) || 0;
          await response.body?.cancel().catch(() => {});
          throw new SupplierApiError(
            'supplier-http-' + response.status,
            response.status >= 500 || [408, 429].includes(response.status),
            Math.min(86400, wait),
          );
        }
        try {
          id = await supplierResponseId(response);
        } catch {
          throw new SupplierApiError('supplier-success-without-valid-order-id');
        }
      }
      await prisma.supplierDispatch.updateMany({
        where: { id: dispatch.id, status: 'sending', lastAttemptAt: attemptAt },
        data: {
          status: 'sent',
          supplierOrderId: id,
          supplierStatus: status,
          sentAt: new Date(),
          lastError: null,
        },
      });
      if (status === 'awaiting_payment')
        await prisma.operationsAlert.upsert({
          where: { key: 'supplier-payment:' + dispatch.id },
          create: {
            key: 'supplier-payment:' + dispatch.id,
            code: 'supplier-payment-required',
            orderId: order.id,
            dispatchId: dispatch.id,
          },
          update: {},
        });
      result.sent++;
      continue;
    } catch (error) {
      if (error instanceof SupplierApiError) {
        code = error.code;
        retryable = error.retryable;
        retryAfter = error.retryAfterSeconds;
      }
    }
    const attempt = dispatch.attempts + 1;
    const review = !retryable || attempt >= 8;
    await prisma.supplierDispatch.updateMany({
      where: { id: dispatch.id, status: 'sending', lastAttemptAt: attemptAt },
      data: {
        status: review ? 'needs_review' : 'failed',
        lastError: code,
        nextAttemptAt: nextRetry(attempt, retryAfter),
      },
    });
    if (review) {
      result.blocked++;
      await prisma.operationsAlert.upsert({
        where: { key: 'dispatch:' + dispatch.id },
        create: {
          key: 'dispatch:' + dispatch.id,
          code: attempt >= 8 ? 'supplier-retries-exhausted' : code,
          orderId: order.id,
          dispatchId: dispatch.id,
        },
        update: { acknowledgedAt: null },
      });
    } else result.retryable = true;
  }
  await refreshSupplierStatus(order.id);
  return result;
}
