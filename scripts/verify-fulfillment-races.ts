import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !/^postgres(?:ql)?:/.test(url) ||
  !new URL(url).pathname.endsWith('_test')
)
  throw new Error('An isolated TEST_DATABASE_URL ending in _test is required');
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.NEXT_PUBLIC_MOCK_MODE = 'false';
process.env.STRIPE_SECRET_KEY = 'sk_test_FIXTURE_ONLY';
delete process.env.SMTP_HOST;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}
async function waitFor(promise: Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<void>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Concurrency test barrier timed out')),
          10000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function main() {
  const { prisma } = await import('../src/lib/prisma');
  const { reserveCheckout } = await import('../src/lib/stockReservations');
  const { recordPaidOrder } = await import('../src/lib/paidOrder');
  const { recordSupplierReconciliation } = await import(
    '../src/lib/orderResolution'
  );
  const { requestOrderRefund } = await import('../src/lib/refunds');
  const { forwardOrderToSupplier } = await import('../src/lib/supplierForward');
  const { claimSupplierDispatch } = await import('../src/lib/dispatchClaim');
  const { runFulfillmentWorker } = await import('../src/lib/fulfillmentWorker');
  const { pollIkonkaTracking } = await import('../src/lib/ikonka');
  const { processTrackingNotifications, enqueueTrackingNotification } =
    await import('../src/lib/trackingNotifications');
  const prefix = 'race-test-' + randomUUID();
  const user = await prisma.user.create({
    data: { email: prefix + '@example.invalid', role: 'admin' },
  });
  const supplierIds: string[] = [];
  const productIds: string[] = [];
  const reservationIds: string[] = [];
  let checks = 0;
  const passed = (name: string) => {
    checks++;
    console.log('PASS ' + name);
  };
  const savedFetch = global.fetch;
  let readGate: {
    orderId: string;
    read: ReturnType<typeof deferred>;
    release: ReturnType<typeof deferred>;
  } | null = null;
  prisma.$use(async (params, next) => {
    const value = await next(params);
    const gate = readGate;
    if (
      gate &&
      params.model === 'Order' &&
      params.action === 'findUnique' &&
      !params.runInTransaction &&
      params.args?.where?.id === gate.orderId
    ) {
      readGate = null;
      gate.read.resolve();
      await gate.release.promise;
    }
    return value;
  });
  for (const suffix of ['a', 'b']) {
    const s = await prisma.supplier.create({
      data: {
        name: prefix + suffix,
        active: true,
        orderForwardingEnabled: true,
        apiUrl: 'https://test-supplier.invalid/orders',
        orderAuthToken: 'TEST-ONLY',
        shippingServicesJson: JSON.stringify([
          {
            code: 'TEST-courier',
            label: 'TEST delivery',
            countries: ['SI'],
            chargeCents: 499,
          },
        ]),
      },
    });
    supplierIds.push(s.id);
    const p = await prisma.product.create({
      data: {
        title: 'TEST product ' + suffix,
        slug: prefix + suffix,
        priceCents: 1000,
        active: true,
        catalogReviewedAt: new Date(),
        imagesVerifiedAt: new Date(),
        supplierId: s.id,
        supplierProductId: 'TEST-' + suffix,
        inventory: { create: { quantity: 100, syncedAt: new Date() } },
      },
    });
    productIds.push(p.id);
  }
  const fakeRefund = {
    create: async () => ({
      id: 're_' + randomUUID(),
      status: 'pending' as const,
    }),
  };
  const reserve = async (two = false) => {
    const r = await reserveCheckout(
      (two ? productIds : [productIds[0]]).map((id) => ({ id, quantity: 1 })),
      'SI',
    );
    reservationIds.push(r.reservation.id);
    return r.reservation;
  };
  const makePaid = async (two = false) => {
    const r = await reserve(two);
    const id = 'cs_' + randomUUID();
    await prisma.checkoutReservation.update({
      where: { id: r.id },
      data: { status: 'open', stripeSessionId: id },
    });
    const saved = await recordPaidOrder({
      id,
      mode: 'payment',
      status: 'complete',
      payment_status: 'paid',
      currency: 'eur',
      amount_total: two ? 2998 : 1499,
      payment_intent: 'pi_' + id,
      customer_details: { email: 'buyer@example.invalid', phone: '+386000000' },
      shipping_details: {
        name: 'TEST recipient',
        address: {
          line1: 'TEST street 1',
          city: 'TEST city',
          postal_code: '0000',
          country: 'SI',
        },
      },
      metadata: { checkout_version: '3', reservation_id: r.id },
    } as unknown as Stripe.Checkout.Session);
    return saved!.order;
  };
  const inventory = () =>
    prisma.inventory.findMany({
      where: { productId: { in: productIds } },
      orderBy: { productId: 'asc' },
    });
  try {
    const cancelled = await makePaid(true);
    const d = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: cancelled.id, supplierId: supplierIds[0] },
    });
    await requestOrderRefund(
      { orderId: cancelled.id, requestId: randomUUID() },
      user.id,
      fakeRefund,
    );
    const before = await inventory();
    await recordSupplierReconciliation(
      d.id,
      'cancel_confirmed',
      'TEST local cancellation before any supplier attempt',
      user.id,
    );
    await recordSupplierReconciliation(
      d.id,
      'cancel_confirmed',
      'TEST repeated local cancellation evidence',
      user.id,
    );
    const after = await inventory();
    for (const old of before) {
      const now = after.find((i) => i.productId === old.productId)!;
      assert.equal(now.quantity, old.quantity);
      assert.equal(
        now.allocatedQuantity,
        old.allocatedQuantity - (old.productId === productIds[0] ? 1 : 0),
      );
    }
    assert.equal(
      (await prisma.supplierDispatch.findUniqueOrThrow({ where: { id: d.id } }))
        .status,
      'cancelled',
    );
    assert.equal(
      (await claimSupplierDispatch(cancelled.id, d.id, true)).state,
      'blocked',
    );
    passed(
      'unattempted cancellation releases its allocation once and preserves another supplier allocation',
    );
    const attempted = await makePaid();
    const a = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: attempted.id },
    });
    await prisma.supplierDispatch.update({
      where: { id: a.id },
      data: {
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(Date.now() - 5000),
        endpointUrl: 'https://test-supplier.invalid/orders',
      },
    });
    await requestOrderRefund(
      { orderId: attempted.id, requestId: randomUUID() },
      user.id,
      fakeRefund,
    );
    const held = (await inventory()).find(
      (i) => i.productId === productIds[0],
    )!.allocatedQuantity;
    await recordSupplierReconciliation(
      a.id,
      'cancel_confirmed',
      'TEST supplier cancellation confirmation after ambiguous attempt',
      user.id,
    );
    assert.equal(
      (await inventory()).find((i) => i.productId === productIds[0])!
        .allocatedQuantity,
      held,
    );
    await prisma.inventory.update({
      where: { productId: productIds[0] },
      data: { syncedAt: new Date() },
    });
    await recordSupplierReconciliation(
      a.id,
      'stock_included',
      'TEST fresh supplier stock includes the confirmed cancellation',
      user.id,
    );
    assert.equal(
      (await inventory()).find((i) => i.productId === productIds[0])!
        .allocatedQuantity,
      held - 1,
    );
    passed(
      'attempted orders retain stock until supplier outcome and a fresh stock snapshot are confirmed',
    );
    const sending = await makePaid();
    const entered = deferred(),
      finish = deferred();
    let refundCalls = 0;
    global.fetch = async () => {
      entered.resolve();
      await finish.promise;
      return new Response(JSON.stringify({ id: 'TEST-sent-' + randomUUID() }));
    };
    const send = forwardOrderToSupplier(sending.id);
    await waitFor(entered.promise);
    try {
      await assert.rejects(
        () =>
          requestOrderRefund(
            { orderId: sending.id, requestId: randomUUID() },
            user.id,
            {
              create: async () => {
                refundCalls++;
                return { id: 're_TEST', status: 'pending' };
              },
            },
          ),
        /dispatch is in progress/,
      );
      assert.equal(refundCalls, 0);
      assert.equal(
        await prisma.refundOperation.count({ where: { orderId: sending.id } }),
        0,
      );
    } finally {
      finish.resolve();
      await send;
    }
    await requestOrderRefund(
      { orderId: sending.id, requestId: randomUUID() },
      user.id,
      fakeRefund,
    );
    passed(
      'a claimed in-flight supplier request blocks financial refund creation until it finishes',
    );
    const refundFirst = await makePaid();
    const gate = {
      orderId: refundFirst.id,
      read: deferred(),
      release: deferred(),
    };
    readGate = gate;
    let networkCalls = 0;
    global.fetch = async () => {
      networkCalls++;
      return new Response('{"id":"must-not-send"}');
    };
    const staleForward = forwardOrderToSupplier(refundFirst.id);
    await waitFor(gate.read.promise);
    try {
      await requestOrderRefund(
        { orderId: refundFirst.id, requestId: randomUUID() },
        user.id,
        fakeRefund,
      );
    } finally {
      gate.release.resolve();
    }
    await staleForward;
    assert.equal(networkCalls, 0);
    assert.equal(
      (
        await prisma.supplierDispatch.findFirstOrThrow({
          where: { orderId: refundFirst.id },
        })
      ).attempts,
      0,
    );
    passed(
      'a stale pre-refund order read is rechecked under the shared claim lock and cannot send',
    );
    const old1 = await reserve(),
      old2 = await reserve(),
      newer = await reserve();
    for (const [index, r] of [old1, old2].entries())
      await prisma.checkoutReservation.update({
        where: { id: r.id },
        data: {
          createdAt: new Date(Date.now() - (30 - index) * 3600000),
          expiresAt: new Date(Date.now() - 3600000),
          stripeRequestJson: '{"mode":"payment"}',
        },
      });
    const recentId = 'cs_expired_' + randomUUID();
    await prisma.checkoutReservation.update({
      where: { id: newer.id },
      data: {
        status: 'open',
        stripeSessionId: recentId,
        createdAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const retrieved: string[] = [];
    const stripe = {
      checkout: {
        sessions: {
          create: async () => {
            throw new Error('Old unknown sessions must not be created again');
          },
          retrieve: async (id: string) => {
            retrieved.push(id);
            return { id, status: 'expired', payment_status: 'unpaid' };
          },
          expire: async () => {
            throw new Error('Unexpected expiry');
          },
        },
      },
      refunds: { retrieve: async (id: string) => ({ id, status: 'pending' }) },
    } as unknown as Pick<Stripe, 'checkout' | 'refunds'>;
    await runFulfillmentWorker({ stripe });
    assert.equal(
      (
        await prisma.checkoutReservation.findUniqueOrThrow({
          where: { id: old1.id },
        })
      ).status,
      'needs_review',
    );
    assert.equal(
      (
        await prisma.checkoutReservation.findUniqueOrThrow({
          where: { id: old2.id },
        })
      ).status,
      'needs_review',
    );
    await runFulfillmentWorker({ stripe });
    assert.ok(retrieved.includes(recentId));
    assert.equal(
      (
        await prisma.checkoutReservation.findUniqueOrThrow({
          where: { id: newer.id },
        })
      ).status,
      'released',
    );
    assert.equal(
      (
        await prisma.reservationItem.findFirstOrThrow({
          where: { reservationId: old1.id },
        })
      ).status,
      'held',
    );
    passed(
      'two unknown sessions older than 24 hours enter manual review without starving newer reservations or freeing their stock',
    );
    const broken1 = await reserve(),
      broken2 = await reserve(),
      healthy = await reserve();
    for (const [index, r] of [broken1, broken2, healthy].entries())
      await prisma.checkoutReservation.update({
        where: { id: r.id },
        data: {
          status: 'open',
          stripeSessionId: 'cs_queue_' + r.id,
          createdAt: new Date(Date.now() - (3 - index) * 3600000),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
    const failingStripe = {
      checkout: {
        sessions: {
          retrieve: async (id: string) => {
            if (id !== 'cs_queue_' + healthy.id)
              throw new Error('TEST temporary Stripe error');
            return { id, status: 'expired', payment_status: 'unpaid' };
          },
        },
      },
      refunds: { retrieve: async (id: string) => ({ id, status: 'pending' }) },
    } as unknown as Pick<Stripe, 'checkout' | 'refunds'>;
    await runFulfillmentWorker({ stripe: failingStripe });
    assert.ok(
      (
        await prisma.checkoutReservation.findUniqueOrThrow({
          where: { id: broken1.id },
        })
      ).reconcileAfter > new Date(),
    );
    await runFulfillmentWorker({ stripe: failingStripe });
    assert.equal(
      (
        await prisma.checkoutReservation.findUniqueOrThrow({
          where: { id: healthy.id },
        })
      ).status,
      'released',
    );
    passed(
      'temporary reservation failures back off and leave the next due reservation processable',
    );
    const tracked = await makePaid();
    const td = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: tracked.id },
    });
    await prisma.supplierDispatch.update({
      where: { id: td.id },
      data: {
        status: 'sent',
        attempts: 1,
        sentAt: new Date(),
        supplierOrderId: 'TEST-IKONKA-ORDER',
        supplierStatus: 'confirmed',
      },
    });
    await prisma.supplier.update({
      where: { id: supplierIds[0] },
      data: {
        orderAdapter: 'ikonka',
        apiUrl: 'https://orders-api.ikonka.eu/v1/orders',
        orderApiUsername: 'account@example.invalid',
        orderAuthToken: 'TEST-ONLY',
        orderApiNextAt: null,
      },
    });
    global.fetch = async (url) => {
      assert.ok(
        String(url).startsWith(
          'https://orders-api.ikonka.eu/v1/orders/tracking?',
        ),
      );
      return new Response(
        JSON.stringify({
          orders: [
            {
              orderNumber: 'TEST-IKONKA-ORDER',
              externalId: td.id,
              trackingNumber: 'TEST-TRACKING',
            },
          ],
        }),
      );
    };
    assert.equal(await pollIkonkaTracking(), 1);
    await prisma.$transaction((tx) =>
      enqueueTrackingNotification(tx, td.id, 'TEST-TRACKING'),
    );
    assert.equal(
      await prisma.trackingNotification.count({ where: { dispatchId: td.id } }),
      1,
    );
    await processTrackingNotifications({
      send: async () => {
        throw new Error('TEST SMTP failure');
      },
    });
    const notification = await prisma.trackingNotification.findFirstOrThrow({
      where: { dispatchId: td.id },
    });
    assert.equal(notification.status, 'failed');
    assert.equal(
      (
        await prisma.supplierDispatch.findUniqueOrThrow({
          where: { id: td.id },
        })
      ).trackingNumber,
      'TEST-TRACKING',
    );
    await prisma.trackingNotification.update({
      where: { id: notification.id },
      data: { nextAttemptAt: new Date(0) },
    });
    let notices = 0;
    const sender = async (email: string, orderId: string, number: string) => {
      assert.equal(email, 'buyer@example.invalid');
      assert.equal(orderId, tracked.id);
      assert.equal(number, 'TEST-TRACKING');
      notices++;
    };
    await Promise.all([
      runFulfillmentWorker({ stripe: null, sendTracking: sender }),
      processTrackingNotifications({ send: sender }),
    ]);
    assert.equal(notices, 1);
    assert.equal(
      (
        await prisma.trackingNotification.findUniqueOrThrow({
          where: { id: notification.id },
        })
      ).status,
      'sent',
    );
    passed(
      'Ikonka tracking durably queues one customer notice, survives SMTP failure and sends once under concurrent workers',
    );
    console.log(checks + ' fulfilment race checks passed');
  } finally {
    global.fetch = savedFetch;
    if (readGate) {
      readGate.release.resolve();
      readGate = null;
    }
    const orders = await prisma.order.findMany({
      where: { reservationId: { in: reservationIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    const dispatches = await prisma.supplierDispatch.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true },
    });
    await prisma.operationsAlert.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { dispatchId: { in: dispatches.map((d) => d.id) } },
          { key: { in: reservationIds.map((id) => 'reservation:' + id) } },
        ],
      },
    });
    await prisma.refundOperation.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.checkoutReservation.deleteMany({
      where: { id: { in: reservationIds } },
    });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
