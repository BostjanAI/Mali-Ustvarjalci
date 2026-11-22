import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !/^postgres(?:ql)?:/.test(url) ||
  !new URL(url).pathname.endsWith('_test')
)
  throw new Error('Use an isolated TEST_DATABASE_URL ending in _test');
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.NEXT_PUBLIC_MOCK_MODE = 'false';
process.env.STRIPE_SECRET_KEY = 'sk_test_FIXTURE_ONLY';
delete process.env.SMTP_HOST;
async function main() {
  const { prisma } = await import('../src/lib/prisma');
  const { reserveCheckout, releaseReservation } = await import(
    '../src/lib/stockReservations'
  );
  const { recordPaidOrder } = await import('../src/lib/paidOrder');
  const { applySupplierItems } = await import('../src/lib/supplierSync');
  const { normalizeFeedItem } = await import('../src/lib/supplierFeed');
  const { requestOrderRefund, applyRefundResult } = await import(
    '../src/lib/refunds'
  );
  const { recordSupplierReconciliation } = await import(
    '../src/lib/orderResolution'
  );
  const { runFulfillmentWorker } = await import('../src/lib/fulfillmentWorker');
  const { forwardOrderToSupplier } = await import('../src/lib/supplierForward');
  const { POST: callback } = await import(
    '../src/app/api/supplier-webhook/route'
  );
  const prefix = 'ops-test-' + randomUUID();
  let checks = 0;
  const check = (name: string, fn: () => void) => {
    fn();
    checks++;
    console.log('PASS ' + name);
  };
  const user = await prisma.user.create({
    data: { email: prefix + '@example.invalid', role: 'admin' },
  });
  const supplier = await prisma.supplier.create({
    data: {
      name: prefix,
      active: true,
      orderForwardingEnabled: true,
      apiUrl: 'https://test-supplier.invalid/orders',
      orderAuthToken: 'TEST-ONLY',
      orderWebhookToken: 'CALLBACK-TEST-ONLY',
      shippingServicesJson: JSON.stringify([
        {
          code: 'test-courier',
          label: 'TEST delivery',
          countries: ['SI'],
          chargeCents: 499,
        },
      ]),
    },
  });
  const product = await prisma.product.create({
    data: {
      title: 'TEST reviewed product',
      description: 'TEST editorial description',
      slug: prefix,
      priceCents: 1900,
      active: true,
      catalogReviewedAt: new Date(),
      imagesVerifiedAt: new Date(),
      supplierId: supplier.id,
      supplierProductId: 'TEST-001',
      supplierManaged: false,
      stockManaged: true,
      priceManaged: false,
      inventory: { create: { quantity: 1, syncedAt: new Date() } },
    },
  });
  const originalFetch = global.fetch;
  const session = (id: string, reservationId: string) => ({
    id,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    currency: 'eur',
    amount_total: 2399,
    payment_intent: 'pi_' + id,
    customer_details: { email: 'buyer@example.invalid', phone: '+38600000000' },
    shipping_details: {
      name: 'TEST recipient',
      address: {
        line1: 'TEST Street 1',
        line2: null,
        city: 'TEST city',
        postal_code: '0000',
        country: 'SI',
        state: null,
      },
    },
    metadata: { checkout_version: '3', reservation_id: reservationId },
  });
  try {
    const concurrent = await Promise.allSettled([
      reserveCheckout([{ id: product.id, quantity: 1 }], 'SI'),
      reserveCheckout([{ id: product.id, quantity: 1 }], 'SI'),
    ]);
    if(!concurrent.some(r=>r.status==='fulfilled'))console.error(concurrent.map(r=>r.status==='rejected'?r.reason: 'fulfilled'));
    check(
      'PostgreSQL serializes competing reservations for the last unit',
      () => {
        assert.equal(
          concurrent.filter((r) => r.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          concurrent.filter((r) => r.status === 'rejected').length,
          1,
        );
      },
    );
    const won = concurrent.find(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<Awaited<ReturnType<typeof reserveCheckout>>>;
    await releaseReservation(won.value.reservation.id, 'stripe-expired');
    await releaseReservation(won.value.reservation.id, 'stripe-expired');
    check('reservation release is idempotent', () => {});
    assert.equal(
      (
        await prisma.inventory.findUniqueOrThrow({
          where: { productId: product.id },
        })
      ).allocatedQuantity,
      0,
    );
    const reserved = await reserveCheckout(
      [{ id: product.id, quantity: 1 }],
      'SI',
    );
    const item = normalizeFeedItem({
      id: 'TEST-001',
      title: 'TEST upstream title',
      description: 'TEST upstream overwrite',
      price: '22.00',
      costPrice: '10.00',
      quantity: '3',
      categoryPath: 'wooden-toys',
    });
    await applySupplierItems(supplier.id, [item]);
    const synced = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { inventory: true },
    });
    check(
      'stock sync preserves allocations and editorial content while recording separate supplier cost',
      () => {
        assert.equal(synced.title, 'TEST reviewed product');
        assert.equal(synced.description, 'TEST editorial description');
        assert.equal(synced.priceCents, 1900);
        assert.equal(synced.costPriceCents, 1000);
        assert.equal(synced.inventory!.quantity, 3);
        assert.equal(synced.inventory!.allocatedQuantity, 1);
      },
    );
    const sid = 'cs_' + randomUUID();
    await prisma.checkoutReservation.update({
      where: { id: reserved.reservation.id },
      data: { stripeSessionId: sid, status: 'open' },
    });
    const first = await recordPaidOrder(
      session(sid, reserved.reservation.id) as never,
    );
    await recordPaidOrder(session(sid, reserved.reservation.id) as never);
    const order = first!.order;
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { productId: product.id },
    });
    check(
      'paid order consumes the existing reservation once without a second stock decrement',
      () => {
        assert.equal(inventory.quantity, 3);
        assert.equal(inventory.allocatedQuantity, 1);
        assert.equal(first!.created, true);
      },
    );
    assert.equal(
      await prisma.order.count({ where: { stripeCheckoutSessionId: sid } }),
      1,
    );
    let refundCalls = 0;
    const refundClient = {
      create: async () => {
        refundCalls++;
        return { id: 're_' + randomUUID(), status: 'pending' as const };
      },
    };
    const requestId = randomUUID();
    const refund = await requestOrderRefund(
      { orderId: order.id, requestId, amountCents: 500 },
      user.id,
      refundClient,
    );
    await requestOrderRefund(
      { orderId: order.id, requestId, amountCents: 500 },
      user.id,
      refundClient,
    );
    await assert.rejects(() =>
      requestOrderRefund(
        { orderId: order.id, requestId: randomUUID(), amountCents: 3000 },
        user.id,
        refundClient,
      ),
    );
    const afterRefund = await prisma.inventory.findUniqueOrThrow({
      where: { productId: product.id },
    });
    check(
      'refund is authenticated by caller, idempotent, amount-bounded and never restores stock',
      () => {
        assert.equal(refundCalls, 1);
        assert.equal(afterRefund.quantity, 3);
        assert.equal(afterRefund.allocatedQuantity, 1);
      },
    );
    await applyRefundResult(refund.id, {
      id: refund.stripeRefundId!,
      status: 'succeeded',
    });
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .refundState,
      'partially_refunded',
    );
    const dispatch = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await prisma.supplierDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'sent',
        sentAt: new Date(Date.now() - 10000),
        supplierOrderId: 'TEST-' + randomUUID(),
        supplierStatus: 'confirmed',
      },
    });
    await prisma.inventory.update({
      where: { productId: product.id },
      data: { syncedAt: new Date() },
    });
    await recordSupplierReconciliation(
      dispatch.id,
      'return_confirmed',
      'TEST supplier received return evidence',
      user.id,
    );
    assert.equal(
      (
        await prisma.inventory.findUniqueOrThrow({
          where: { productId: product.id },
        })
      ).quantity,
      3,
    );
    await recordSupplierReconciliation(
      dispatch.id,
      'stock_included',
      'TEST fresh snapshot includes this supplier order',
      user.id,
    );
    await recordSupplierReconciliation(
      dispatch.id,
      'stock_included',
      'TEST repeated reconciliation evidence',
      user.id,
    );
    check(
      'supplier reconciliation retires an allocation once without inventing physical stock',
      () => {},
    );
    assert.equal(
      (
        await prisma.inventory.findUniqueOrThrow({
          where: { productId: product.id },
        })
      ).allocatedQuantity,
      0,
    );
    const r2 = await reserveCheckout([{ id: product.id, quantity: 1 }], 'SI');
    const sid2 = 'cs_' + randomUUID();
    await prisma.checkoutReservation.update({
      where: { id: r2.reservation.id },
      data: { stripeSessionId: sid2, status: 'open' },
    });
    const paid2 = await recordPaidOrder(
      session(sid2, r2.reservation.id) as never,
    );
    const d2 = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: paid2!.order.id },
    });
    let requests = 0;
    global.fetch = async () => {
      requests++;
      return new Response(
        JSON.stringify({ id: 'TEST-ACCEPTED-' + randomUUID() }),
      );
    };
    await prisma.supplierDispatch.update({
      where: { id: d2.id },
      data: { nextAttemptAt: new Date(Date.now() + 3600000) },
    });
    await runFulfillmentWorker({ stripe: null });
    assert.equal(requests, 0);
    await prisma.supplierDispatch.update({
      where: { id: d2.id },
      data: { nextAttemptAt: new Date(0) },
    });
    await Promise.all([
      runFulfillmentWorker({ stripe: null }),
      runFulfillmentWorker({ stripe: null }),
    ]);
    check(
      'independent concurrent workers respect due times and claim one supplier request',
      () => assert.equal(requests, 1),
    );
    const placed = await prisma.supplierDispatch.findUniqueOrThrow({
      where: { id: d2.id },
    });
    const notify = (trackingNumber?: string) =>
      callback(
        new Request('https://store.invalid/api/supplier-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-supplier-id': supplier.id,
            'x-api-key': 'CALLBACK-TEST-ONLY',
          },
          body: JSON.stringify({
            supplierOrderId: placed.supplierOrderId,
            status: 'shipped',
            ...(trackingNumber ? { trackingNumber } : {}),
          }),
        }),
      );
    await notify();
    await notify('TEST-LATE-TRACKING');
    await notify('TEST-LATE-TRACKING');
    check(
      'late tracking number survives repeated shipped notifications',
      () => {},
    );
    assert.equal(
      (
        await prisma.supplierDispatch.findUniqueOrThrow({
          where: { id: d2.id },
        })
      ).trackingNumber,
      'TEST-LATE-TRACKING',
    );
    const r3 = await reserveCheckout([{ id: product.id, quantity: 1 }], 'SI');
    const sid3 = 'cs_' + randomUUID();
    await prisma.checkoutReservation.update({
      where: { id: r3.reservation.id },
      data: { stripeSessionId: sid3, status: 'open' },
    });
    const paid3 = await recordPaidOrder(
      session(sid3, r3.reservation.id) as never,
    );
    const d3 = await prisma.supplierDispatch.findFirstOrThrow({
      where: { orderId: paid3!.order.id },
    });
    await prisma.supplierDispatch.update({
      where: { id: d3.id },
      data: { attempts: 7, nextAttemptAt: new Date(0) },
    });
    global.fetch = async () => new Response('', { status: 503 });
    await forwardOrderToSupplier(paid3!.order.id);
    check('exhausted retries create a durable operational alert', () => {});
    assert.equal(
      (
        await prisma.supplierDispatch.findUniqueOrThrow({
          where: { id: d3.id },
        })
      ).status,
      'needs_review',
    );
    assert.equal(
      await prisma.operationsAlert.count({
        where: { key: 'dispatch:' + d3.id, acknowledgedAt: null },
      }),
      1,
    );
    console.log(checks + ' PostgreSQL integration checks passed');
  } finally {
    global.fetch = originalFetch;
    const orders = await prisma.order.findMany({
      where: { items: { some: { productId: product.id } } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    await prisma.operationsAlert.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          {
            dispatchId: {
              in: (
                await prisma.supplierDispatch.findMany({
                  where: { orderId: { in: orderIds } },
                  select: { id: true },
                })
              ).map((d) => d.id),
            },
          },
        ],
      },
    });
    await prisma.refundOperation.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.checkoutReservation.deleteMany({
      where: { items: { some: { productId: product.id } } },
    });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.supplier.delete({ where: { id: supplier.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
