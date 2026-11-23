import { prisma } from '@/lib/prisma';
import { readShippingAddress } from './orderDelivery';
import { validOrderEndpoint, supplierRequestSchema } from './supplierOrderApi';
export async function claimSupplierDispatch(
  orderId: string,
  dispatchId: string,
  force = false,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { dispatches: { include: { supplier: true } } },
    });
    const blocked = (retryable = false) => ({
      state: 'blocked' as const,
      retryable,
    });
    if (
      !order ||
      order.status !== 'paid' ||
      order.refundState !== 'none' ||
      order.fulfillmentHold ||
      order.supplierStatus === 'refunded' ||
      !order.stripeCheckoutSessionId ||
      !readShippingAddress(order.shippingAddressJson) ||
      order.dispatches.some((d) =>
        ['cancelled', 'refunded'].includes(d.supplierStatus || ''),
      )
    )
      return blocked();
    const dispatch = order.dispatches.find((d) => d.id === dispatchId);
    if (
      !dispatch ||
      !['pending', 'failed', 'sending'].includes(dispatch.status)
    )
      return blocked();
    const now = new Date();
    if (
      dispatch.status === 'sending' &&
      (!dispatch.lastAttemptAt ||
        dispatch.lastAttemptAt.getTime() >= now.getTime() - 120000)
    )
      return blocked(true);
    if (!force && dispatch.nextAttemptAt > now) return blocked();
    const supplier = dispatch.supplier;
    if (
      !supplier.active ||
      !supplier.orderForwardingEnabled ||
      !supplier.apiUrl ||
      !validOrderEndpoint(supplier.apiUrl) ||
      !supplier.orderAuthToken
    ) {
      await tx.supplierDispatch.update({
        where: { id: dispatch.id },
        data: {
          ...(dispatch.status === 'sending' ? { status: 'needs_review' } : {}),
          lastError: 'supplier-order-api-not-configured',
          nextAttemptAt: new Date(now.getTime() + 3600000),
        },
      });
      await tx.operationsAlert.upsert({
        where: { key: 'supplier-config:' + supplier.id },
        create: {
          key: 'supplier-config:' + supplier.id,
          code: 'supplier-order-api-not-configured',
          orderId,
          dispatchId,
        },
        update: {},
      });
      return blocked();
    }
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(dispatch.requestJson);
    } catch {
      snapshot = null;
    }
    const parsed = supplierRequestSchema.safeParse(snapshot);
    const error =
      dispatch.endpointUrl && dispatch.endpointUrl !== supplier.apiUrl
        ? 'endpoint-changed-after-attempt'
        : !parsed.success || parsed.data.orderId !== orderId
          ? 'invalid-dispatch-snapshot'
          : null;
    if (error || !parsed.success) {
      await tx.supplierDispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'needs_review',
          lastError: error || 'invalid-dispatch-snapshot',
        },
      });
      return blocked();
    }
    const claimed = await tx.supplierDispatch.updateMany({
      where: {
        id: dispatchId,
        OR: [
          { status: { in: ['pending', 'failed'] } },
          {
            status: 'sending',
            lastAttemptAt: { lt: new Date(now.getTime() - 120000) },
          },
        ],
      },
      data: {
        status: 'sending',
        lastAttemptAt: now,
        attempts: { increment: 1 },
        endpointUrl: supplier.apiUrl,
        lastError: null,
      },
    });
    if (!claimed.count) return blocked(true);
    return {
      state: 'claimed' as const,
      dispatch,
      order,
      supplier: {
        ...supplier,
        apiUrl: supplier.apiUrl,
        orderAuthToken: supplier.orderAuthToken,
      },
      request: parsed.data,
      attemptAt: now,
    };
  });
}
