import { prisma } from '@/lib/prisma';

export async function forwardOrderToSupplier(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const url = process.env.SUPPLIER_ORDER_URL;
  if (!url) return;

  const maxRetries = 3;
  let attempt = 0;
  let backoffMs = 500;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPPLIER_API_KEY}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          email: order.email,
          totalCents: order.totalCents,
          items: order.items,
        }),
      });
      if (!res.ok) throw new Error(`Supplier API ${res.status}`);
      const data = await res.json();
      await prisma.order.update({
        where: { id: order.id },
        data: { supplierOrderId: data.id ?? null, supplierStatus: 'confirmed', forwardedToSupplierAt: new Date() },
      });
      return;
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) {
        await prisma.syncLog.create({ data: { type: 'order-forward', errors: 1, added: 0, updated: 0, deactivated: 0, message: `Failed to forward order ${order.id}` } });
        throw e;
      }
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs *= 2;
    }
  }
}







