import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendTrackingAvailable } from './email';
export async function enqueueTrackingNotification(
  tx: Prisma.TransactionClient,
  dispatchId: string,
  trackingNumber: string,
) {
  return tx.trackingNotification.upsert({
    where: { dispatchId_trackingNumber: { dispatchId, trackingNumber } },
    create: { dispatchId, trackingNumber },
    update: {},
  });
}
export async function processTrackingNotifications(
  options: { send?: typeof sendTrackingAvailable } = {},
) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return { sent: 0, failed: 0 };
  const now = new Date();
  const rows = await prisma.trackingNotification.findMany({
    where: {
      nextAttemptAt: { lte: now },
      status: { in: ['pending', 'failed', 'sending'] },
    },
    include: {
      dispatch: { include: { order: { select: { id: true, email: true } } } },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: 2,
  });
  if (rows.length && !options.send && !process.env.SMTP_HOST) {
    await prisma.operationsAlert.upsert({
      where: { key: 'tracking-mail-configuration' },
      create: {
        key: 'tracking-mail-configuration',
        code: 'tracking-email-smtp-not-configured',
      },
      update: {},
    });
    return { sent: 0, failed: 0 };
  }
  let sent = 0,
    failed = 0;
  for (const row of rows) {
    const token = randomUUID();
    const claimed = await prisma.trackingNotification.updateMany({
      where: { id: row.id, nextAttemptAt: { lte: now }, status: row.status },
      data: {
        status: 'sending',
        attemptToken: token,
        attempts: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 120000),
      },
    });
    if (!claimed.count) continue;
    try {
      await (options.send || sendTrackingAvailable)(
        row.dispatch.order.email,
        row.dispatch.order.id,
        row.trackingNumber,
      );
      await prisma.trackingNotification.updateMany({
        where: { id: row.id, status: 'sending', attemptToken: token },
        data: { status: 'sent', sentAt: new Date(), lastError: null },
      });
      sent++;
    } catch {
      const attempt = row.attempts + 1;
      await prisma.trackingNotification.updateMany({
        where: { id: row.id, status: 'sending', attemptToken: token },
        data: {
          status: attempt >= 8 ? 'needs_review' : 'failed',
          lastError: 'tracking-email-send-failed',
          nextAttemptAt: new Date(
            Date.now() + Math.min(21600, 60 * 2 ** (attempt - 1)) * 1000,
          ),
        },
      });
      failed++;
      await prisma.operationsAlert.upsert({
        where: { key: 'tracking-mail:' + row.id },
        create: {
          key: 'tracking-mail:' + row.id,
          code: 'tracking-email-send-failed',
          orderId: row.dispatch.order.id,
          dispatchId: row.dispatchId,
        },
        update: { acknowledgedAt: null },
      });
    }
  }
  return { sent, failed };
}
