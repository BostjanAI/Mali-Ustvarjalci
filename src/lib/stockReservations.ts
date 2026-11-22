import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { priceCart, type RequestedItem } from './checkoutPricing';
import { publishedProducts } from './catalogProduct';
import { deliveryQuote } from './shippingServices';
import settings from '../../config/supplier-import.json';
import { stockAvailability } from './productDetails';
export async function allocateStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
) {
  const rows = await tx.$queryRaw<
    Array<{ id: string }>
  >`SELECT "id" FROM "Inventory" WHERE "productId"=${productId} FOR UPDATE`;
  if (rows.length !== 1) throw new Error('Stock record unavailable');
  const inventory = await tx.inventory.findUniqueOrThrow({
    where: { productId },
  });
  if (
    stockAvailability(
      inventory.quantity,
      inventory.syncedAt,
      Date.now(),
      settings.stockMaxAgeHours,
    ) !== 'in_stock' ||
    inventory.quantity - inventory.allocatedQuantity < quantity
  )
    throw new Error('Insufficient confirmed stock');
  await tx.inventory.update({
    where: { productId },
    data: { allocatedQuantity: { increment: quantity } },
  });
}
export async function reserveCheckout(items: RequestedItem[], country: string) {
  return prisma.$transaction(
    async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i) => i.id) }, ...publishedProducts },
        include: { inventory: true },
      });
      const cart = priceCart(items, products);
      if (cart.some((p) => !p.supplierId || !p.supplierProductId))
        throw new Error('Supplier references missing');
      const suppliers = await tx.supplier.findMany({
        where: { id: { in: cart.map((i) => i.supplierId!) } },
      });
      const quote = deliveryQuote(
        suppliers,
        cart.map((i) => i.supplierId!),
        country,
      );
      const reservation = await tx.checkoutReservation.create({
        data: {
          cartJson: JSON.stringify(cart),
          shippingServiceJson: JSON.stringify(quote),
          expiresAt: new Date(Date.now() + 35 * 60000),
          items: {
            create: cart.map((i) => ({
              productId: i.id,
              supplierId: i.supplierId,
              quantity: i.quantity,
            })),
          },
        },
      });
      for (const item of [...cart].sort((a, b) => a.id.localeCompare(b.id)))
        await allocateStock(tx, item.id, item.quantity);
      return { reservation, cart, quote, suppliers };
    },
    { timeout: 30000 },
  );
}
export async function releaseReservation(
  id: string,
  reason: 'creation-rejected' | 'stripe-expired' | 'async-payment-failed',
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "CheckoutReservation" WHERE "id"=${id} FOR UPDATE`;
    const r = await tx.checkoutReservation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!r || ['committed', 'released'].includes(r.status)) return false;
    for (const item of [...r.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      if (item.status !== 'held') continue;
      const updated = await tx.reservationItem.updateMany({
        where: { id: item.id, status: 'held' },
        data: { status: 'released' },
      });
      if (updated.count)
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { allocatedQuantity: { decrement: item.quantity } },
        });
    }
    await tx.checkoutReservation.update({
      where: { id },
      data: { status: 'released' },
    });
    return true;
  });
}
