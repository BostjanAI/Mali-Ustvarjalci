import { processTrackingNotifications } from './trackingNotifications';
import type { sendTrackingAvailable } from './email';
import { nextRetry } from './supplierForward';
import { pollIkonkaTracking } from './ikonka';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { recordPaidOrder } from './paidOrder';
import { forwardOrderToSupplier } from './supplierForward';
import { releaseReservation } from './stockReservations';
import { applyRefundResult } from './refunds';
async function alert(key: string, code: string) {
  await prisma.operationsAlert.upsert({
    where: { key },
    create: { key, code },
    update: {},
  });
}
export async function runFulfillmentWorker(
  options: {
    stripe?: Pick<Stripe, 'checkout' | 'refunds'> | null;
    sendTracking?: typeof sendTrackingAvailable;
  } = {},
) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return { disabled: true };
  const now = new Date();
  let reservations = 0,
    dispatches = 0,
    refunds = 0;
  const stripe =
    'stripe' in options
      ? options.stripe
      : process.env.STRIPE_SECRET_KEY
        ? new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
            timeout: 10000,
            maxNetworkRetries: 0,
          })
        : null;
  if (stripe) {
    const stale = await prisma.checkoutReservation.findMany({
      where: {
        status: { in: ['creating', 'open', 'awaiting_payment'] },
        reconcileAfter: { lte: now },
        OR: [
          { expiresAt: { lte: now } },
          {
            status: 'creating',
            createdAt: { lte: new Date(now.getTime() - 120000) },
          },
        ],
      },
      orderBy: [{ reconcileAfter: 'asc' }, { createdAt: 'asc' }],
      take: 2,
    });
    for (const r of stale) {
      const leaseUntil = new Date(Date.now() + 120000);
      const reservationClaim = {
        id: r.id,
        reconcileAfter: leaseUntil,
        status: { in: ['creating', 'open', 'awaiting_payment'] },
      };
      const claim = await prisma.checkoutReservation.updateMany({
        where: { id: r.id, status: r.status, reconcileAfter: { lte: now } },
        data: {
          reconcileAfter: leaseUntil,
          reconcileAttempts: { increment: 1 },
        },
      });
      if (!claim.count) continue;
      try {
        let id = r.stripeSessionId;
        if (!id && r.stripeRequestJson) {
          if (Date.now() - r.createdAt.getTime() > 86400000) {
            await prisma.checkoutReservation.updateMany({
              where: reservationClaim,
              data: {
                status: 'needs_review',
                reconciliationError: 'checkout-identity-needs-review',
              },
            });
            await alert(
              'reservation:' + r.id,
              'checkout-identity-needs-review',
            );
            continue;
          }
          const recovered = await stripe.checkout.sessions.create(
            JSON.parse(r.stripeRequestJson),
            { idempotencyKey: r.id },
          );
          id = recovered.id;
          const linked = await prisma.checkoutReservation.updateMany({
            where: reservationClaim,
            data: { stripeSessionId: id, status: 'open' },
          });
          if (!linked.count) continue;
        }
        if (!id) {
          if (
            !r.stripeRequestJson &&
            Date.now() - r.createdAt.getTime() > 3600000
          )
            await releaseReservation(r.id, 'creation-rejected');
          continue;
        }
        let session = await stripe.checkout.sessions.retrieve(id);
        if (session.status === 'open' && r.expiresAt.getTime() <= Date.now())
          session = await stripe.checkout.sessions.expire(id);
        if (session.status === 'expired')
          await releaseReservation(r.id, 'stripe-expired');
        else if (
          session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required'
        )
          await recordPaidOrder(session);
        else if (session.status === 'complete')
          await prisma.checkoutReservation.updateMany({
            where: reservationClaim,
            data: { status: 'awaiting_payment' },
          });
        await prisma.checkoutReservation.updateMany({
          where: reservationClaim,
          data: {
            reconcileAfter: nextRetry(1, 900),
            reconciliationError: null,
          },
        });
        reservations++;
      } catch {
        const exhausted = r.reconcileAttempts + 1 >= 8;
        await prisma.checkoutReservation.updateMany({
          where: reservationClaim,
          data: {
            ...(exhausted ? { status: 'needs_review' } : {}),
            reconcileAfter: nextRetry(r.reconcileAttempts + 1),
            reconciliationError: 'checkout-reconciliation-failed',
          },
        });
        await alert('reservation:' + r.id, 'checkout-reconciliation-failed');
      }
    }
    const pending = await prisma.refundOperation.findMany({
      where: {
        status: { in: ['pending', 'needs_review'] },
        stripeRefundId: { not: null },
      },
      orderBy: { updatedAt: 'asc' },
      take: 2,
    });
    for (const refund of pending) {
      try {
        await applyRefundResult(
          refund.id,
          await stripe.refunds.retrieve(refund.stripeRefundId!),
        );
        refunds++;
      } catch {
        await alert('refund:' + refund.id, 'refund-reconciliation-failed');
      }
    }
  }
  const due = await prisma.supplierDispatch.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [
        { status: { in: ['pending', 'failed'] } },
        {
          status: 'sending',
          lastAttemptAt: { lte: new Date(now.getTime() - 120000) },
        },
      ],
      order: { status: 'paid', fulfillmentHold: null, refundState: 'none' },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: 2,
  });
  for (const d of due) {
    try {
      await forwardOrderToSupplier(d.orderId, { dispatchId: d.id });
      dispatches++;
    } catch {
      await alert('dispatch:' + d.id, 'supplier-dispatch-worker-failed');
    }
  }
  const tracking = await pollIkonkaTracking();
  const trackingNotifications = await processTrackingNotifications({
    send: options.sendTracking,
  });
  return {
    tracking,
    trackingNotifications,
    reservations,
    dispatches,
    refunds,
    openAlerts: await prisma.operationsAlert.count({
      where: { acknowledgedAt: null },
    }),
  };
}
