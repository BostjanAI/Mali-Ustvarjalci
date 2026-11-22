import type Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readCartMetadata } from './checkoutPricing';
import {
  paidCartSchema,
  sessionShippingAddress,
  settledCheckout,
  supplierPayload,
} from './orderDelivery';
// The unique Checkout Session ID and one transaction guard both order creation and inventory.
export async function recordPaidOrder(session: Stripe.Checkout.Session) {
  if (!settledCheckout(session)) return null;
  if (
    !session.id ||
    !Number.isSafeInteger(session.amount_total) ||
    session.amount_total! < 0
  )
    throw new Error('Invalid settled checkout');
  const existing = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (existing) return { order: existing, created: false };
  const paymentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  if (paymentId) {
    const legacy = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentId },
    });
    if (legacy) return { order: legacy, created: false };
  }
  const email = z
    .string()
    .email()
    .parse(
      session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email,
    );
  const cart = paidCartSchema.parse(readCartMetadata(session.metadata));
  const address = sessionShippingAddress(session);
  try {
    return await prisma.$transaction(
      async (tx) => {
        const products = await tx.product.findMany({
          where: { id: { in: cart.map((i) => i.id) } },
          select: { id: true },
        });
        if (products.length !== cart.length)
          throw new Error('Checkout contains unavailable product references');
        const snapshotTrusted = session.metadata?.checkout_version === '2';
        const holds: string[] = [];
        if (!address) holds.push('delivery-address-missing-or-invalid');
        if (!snapshotTrusted) holds.push('legacy-checkout-supplier-review');
        const items = cart.map((i) => ({
          productId: i.id,
          title: i.title,
          unitPriceCents: i.priceCents,
          quantity: i.quantity,
          supplierId: snapshotTrusted ? i.supplierId || null : null,
          supplierProductId: snapshotTrusted
            ? i.supplierProductId || null
            : null,
        }));
        if (items.some((i) => !i.supplierId || !i.supplierProductId))
          holds.push('supplier-reference-missing');
        const order = await tx.order.create({
          data: {
            email,
            totalCents: session.amount_total!,
            currency: 'EUR',
            status: 'paid',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null,
            shippingAddressJson: address ? JSON.stringify(address) : null,
            items: { create: items },
          },
        });
        for (const item of items) {
          const result = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });
          if (result.count !== 1) holds.push('inventory-review-required');
        }
        if (!holds.length && address) {
          const groups = new Map<string, typeof items>();
          for (const item of items) {
            const supplierId = item.supplierId!;
            groups.set(supplierId, [...(groups.get(supplierId) || []), item]);
          }
          for (const [supplierId, group] of groups) {
            await tx.supplierDispatch.create({
              data: {
                orderId: order.id,
                supplierId,
                requestJson: JSON.stringify(
                  supplierPayload(order.id, email, address, group),
                ),
              },
            });
          }
        }
        const saved = await tx.order.update({
          where: { id: order.id },
          data: {
            fulfillmentHold: holds.length
              ? Array.from(new Set(holds)).join(',')
              : null,
            supplierStatus: holds.length ? 'needs_review' : 'pending',
          },
        });
        return { order: saved, created: true };
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      const duplicate = await prisma.order.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });
      if (duplicate) return { order: duplicate, created: false };
    }
    throw error;
  }
}
