import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
export const refundInput = z.object({
  orderId: z.string().min(1).max(150),
  requestId: z.string().uuid(),
  amountCents: z.number().int().positive().optional(),
});
export async function requestOrderRefund(
  input: z.infer<typeof refundInput>,
  requestedBy: string,
  client?: {
    create: (
      params: Stripe.RefundCreateParams,
      options: Stripe.RequestOptions,
    ) => Promise<Pick<Stripe.Refund, 'id' | 'status'>>;
  },
) {
  const parsed = refundInput.parse(input);
  if (
    process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ||
    !process.env.STRIPE_SECRET_KEY
  )
    throw new Error('Refunds disabled');
  const key = parsed.orderId + ':' + parsed.requestId;
  const operation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${parsed.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: parsed.orderId },
      include: { refunds: true, dispatches: true },
    });
    if (!order?.stripePaymentIntentId) throw new Error('No refundable payment');
    if (order.dispatches.some((d) => d.status === 'sending'))
      throw new Error(
        'Supplier dispatch is in progress; reconcile it before starting a refund',
      );
    const existing = order.refunds.find((r) => r.requestKey === key);
    if (existing) {
      if (parsed.amountCents && existing.amountCents !== parsed.amountCents)
        throw new Error('Refund reference amount changed');
      return { ...existing, paymentId: order.stripePaymentIntentId };
    }
    const committed = order.refunds
      .filter((r) => r.status !== 'failed')
      .reduce((sum, r) => sum + r.amountCents, 0);
    const remaining = order.totalCents - committed;
    const amount = parsed.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining)
      throw new Error('Refund exceeds remaining payment');
    const op = await tx.refundOperation.create({
      data: {
        orderId: order.id,
        requestKey: key,
        amountCents: amount,
        requestedBy,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundState: 'pending',
        fulfillmentHold: 'refund-supplier-reconciliation',
      },
    });
    await tx.supplierDispatch.updateMany({
      where: { orderId: order.id },
      data: { reconciliationStatus: 'required' },
    });
    await tx.auditLog.create({
      data: {
        userId: requestedBy,
        action: 'refund.requested',
        metadata: JSON.stringify({
          orderId: order.id,
          refundOperationId: op.id,
          amountCents: amount,
        }),
      },
    });
    return { ...op, paymentId: order.stripePaymentIntentId };
  });
  if (['succeeded', 'pending', 'failed'].includes(operation.status))
    return operation;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  try {
    const refund = await (client || stripe.refunds).create(
      {
        payment_intent: operation.paymentId,
        amount: operation.amountCents,
        metadata: { refundOperationId: operation.id },
      },
      { idempotencyKey: operation.id },
    );
    await applyRefundResult(operation.id, refund);
    return await prisma.refundOperation.findUniqueOrThrow({
      where: { id: operation.id },
    });
  } catch {
    await prisma.refundOperation.update({
      where: { id: operation.id },
      data: { status: 'needs_review', lastError: 'stripe-outcome-unconfirmed' },
    });
    await prisma.operationsAlert.upsert({
      where: { key: 'refund:' + operation.id },
      create: {
        key: 'refund:' + operation.id,
        code: 'refund-outcome-unconfirmed',
        orderId: parsed.orderId,
      },
      update: { acknowledgedAt: null },
    });
    throw new Error(
      'Refund outcome requires review; retry using the same reference',
    );
  }
}
export async function applyRefundResult(
  operationId: string,
  refund: { id: string; status?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const operation = await tx.refundOperation.findUniqueOrThrow({
      where: { id: operationId },
    });
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${operation.orderId} FOR UPDATE`;
    const status =
      refund.status === 'succeeded'
        ? 'succeeded'
        : ['failed', 'canceled'].includes(refund.status || '')
          ? 'failed'
          : 'pending';
    await tx.refundOperation.update({
      where: { id: operation.id },
      data: { status, stripeRefundId: refund.id, lastError: null },
    });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: operation.orderId },
      include: { refunds: true },
    });
    const total = order.refunds
      .filter((r) => r.status === 'succeeded')
      .reduce((s, r) => s + r.amountCents, 0);
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundState: order.refunds.some((r) =>
          ['pending', 'requested', 'needs_review'].includes(r.status),
        )
          ? 'pending'
          : total >= order.totalCents
            ? 'refunded'
            : total > 0
              ? 'partially_refunded'
              : 'failed',
        ...(total >= order.totalCents ? { status: 'refunded' } : {}),
      },
    });
    return { status };
  });
}
