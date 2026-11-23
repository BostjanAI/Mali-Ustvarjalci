import { prisma } from '@/lib/prisma';
import {
  shippingAddressSchema,
  supplierPayload,
  type ShippingAddress,
} from './orderDelivery';
export async function resolveHeldOrder(
  orderId: string,
  mode: 'address' | 'manual_fulfilled',
  evidence: string,
  userId: string,
  address?: ShippingAddress,
) {
  if (evidence.trim().length < 12) throw new Error('Evidence required');
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, dispatches: true },
    });
    if (
      order.status !== 'paid' ||
      order.dispatches.some((d) => d.status === 'sending')
    )
      throw new Error('Order is not editable');
    if (mode === 'manual_fulfilled') {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'manual_fulfilled', fulfillmentHold: null },
      });
    } else {
      if (
        order.refundState !== 'none' ||
        order.dispatches.some((d) => d.attempts > 0)
      )
        throw new Error(
          'Attempted/refunded order requires supplier reconciliation',
        );
      const delivery = shippingAddressSchema.parse(address);
      const holds = (order.fulfillmentHold || '')
        .split(',')
        .filter((h) => h && h !== 'delivery-address-missing-or-invalid');
      if (order.items.some((i) => !i.supplierId || !i.supplierProductId))
        throw new Error('Supplier reference missing');
      await tx.order.update({
        where: { id: orderId },
        data: {
          shippingAddressJson: JSON.stringify(delivery),
          fulfillmentHold: holds.length ? holds.join(',') : null,
        },
      });
      if (!holds.length) {
        const services = JSON.parse(order.shippingServiceJson || '{}');
        for (const supplierId of new Set(
          order.items.map((i) => i.supplierId!),
        )) {
          const payload = {
            ...supplierPayload(
              order.id,
              order.email,
              delivery,
              order.items.filter((i) => i.supplierId === supplierId),
            ),
            ...(services.bySupplier?.[supplierId]
              ? { shippingService: services.bySupplier[supplierId] }
              : {}),
          };
          await tx.supplierDispatch.upsert({
            where: { orderId_supplierId: { orderId, supplierId } },
            create: {
              orderId,
              supplierId,
              requestJson: JSON.stringify(payload),
            },
            update: { requestJson: JSON.stringify(payload) },
          });
        }
      }
    }
    await tx.auditLog.create({
      data: {
        userId,
        action: 'order.resolve.' + mode,
        metadata: JSON.stringify({ orderId, evidence }),
      },
    });
  });
}
export async function recordSupplierReconciliation(
  dispatchId: string,
  resolution: 'cancel_confirmed' | 'return_confirmed' | 'stock_included',
  evidence: string,
  userId: string,
) {
  if (evidence.trim().length < 12)
    throw new Error('Supplier evidence required');
  return prisma.$transaction(async (tx) => {
    const reference = await tx.supplierDispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      select: { orderId: true },
    });
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${reference.orderId} FOR UPDATE`;
    // Read after acquiring the same lock used by dispatch and refund.
    const d = await tx.supplierDispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      include: { order: true },
    });
    if (d.status === 'sending')
      throw new Error(
        'Supplier dispatch is in progress; reconciliation must wait',
      );
    const neverAttempted =
      ['pending', 'failed', 'needs_review', 'cancelled'].includes(d.status) &&
      d.attempts === 0 &&
      !d.lastAttemptAt &&
      !d.sentAt &&
      !d.supplierOrderId &&
      !d.endpointUrl;
    const cancelLocally = resolution === 'cancel_confirmed' && neverAttempted;
    if (cancelLocally) {
      await tx.supplierDispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'cancelled',
          supplierStatus: 'cancelled',
          reconciliationStatus: resolution,
          reconciliationNote: evidence,
        },
      });
      const holds = new Set(
        (d.order.fulfillmentHold || '').split(',').filter(Boolean),
      );
      holds.add('supplier-cancellation-reconciliation');
      await tx.order.update({
        where: { id: d.orderId },
        data: { fulfillmentHold: [...holds].join(',') },
      });
    }
    if (cancelLocally || resolution === 'stock_included') {
      if (!d.order.reservationId)
        throw new Error('No stock allocation to reconcile');
      const items = await tx.reservationItem.findMany({
        where: {
          reservationId: d.order.reservationId,
          supplierId: d.supplierId,
          status: 'committed',
        },
        orderBy: { productId: 'asc' },
      });
      const cutoff = d.sentAt || d.lastAttemptAt;
      if (
        !cancelLocally &&
        items.length &&
        (!cutoff ||
          (!d.sentAt &&
            !['cancel_confirmed', 'return_confirmed'].includes(
              d.reconciliationStatus,
            )))
      )
        throw new Error(
          'A confirmed supplier outcome is required for attempted orders',
        );
      for (const item of items) {
        await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "productId"=${item.productId} FOR UPDATE`;
        if (!cancelLocally) {
          const inventory = await tx.inventory.findUniqueOrThrow({
            where: { productId: item.productId },
          });
          if (
            !inventory.syncedAt ||
            inventory.syncedAt <= cutoff! ||
            Date.now() - inventory.syncedAt.getTime() > 3600000
          )
            throw new Error('Fresh supplier snapshot required after order');
        }
        const claimed = await tx.reservationItem.updateMany({
          where: { id: item.id, status: 'committed' },
          data: { status: cancelLocally ? 'released' : 'accounted' },
        });
        if (claimed.count)
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { allocatedQuantity: { decrement: item.quantity } },
          });
      }
      await tx.supplierDispatch.update({
        where: { id: dispatchId },
        data: { stockAccountedAt: new Date(), reconciliationNote: evidence },
      });
    } else {
      await tx.supplierDispatch.update({
        where: { id: dispatchId },
        data: {
          reconciliationStatus: resolution,
          reconciliationNote: evidence,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId,
        action: 'supplier.reconcile.' + resolution,
        metadata: JSON.stringify({
          orderId: d.orderId,
          dispatchId,
          evidence,
          allocationReleasedLocally: cancelLocally,
        }),
      },
    });
  });
}
