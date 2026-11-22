const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
function harness({
  prisma = {},
  fetchMock = () => Promise.reject(new Error('No real network')),
  env = {},
  stripeMock,
  emails = {},
} = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!fs.existsSync(file)) {
      for (const ext of ['.ts', '.tsx', '.json'])
        if (fs.existsSync(file + ext)) {
          file += ext;
          break;
        }
    }
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    if (file.endsWith('.json')) {
      module.exports = JSON.parse(fs.readFileSync(file, 'utf8'));
      return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const req = (id) =>
      id === 'stripe' && stripeMock
        ? stripeMock
        : id === '@/lib/email'
          ? {
              sendOrderConfirmation: async () => {},
              sendShippingUpdate: async () => {},
              ...emails,
            }
          : id === '@/lib/rateLimit'
            ? { rateLimit: () => true }
            : id === '@/lib/prisma'
              ? { prisma }
              : id.startsWith('@/')
                ? load('src/' + id.slice(2))
                : id.startsWith('.')
                  ? load(path.resolve(path.dirname(file), id))
                  : require(id);
    vm.runInNewContext(
      '(function(require,module,exports,process){' + code + NL + '})',
      {
        console,
        Buffer,
        URL,
        Request,
        Response,
        AbortSignal,
        fetch: fetchMock,
        setTimeout,
        clearTimeout,
      },
      { filename: file },
    )(req, module, module.exports, { env });
    return module.exports;
  }
  return { load };
}

function database() {
  let state = {
    orders: [],
    dispatches: [],
    products: [{ id: 'p1' }, { id: 'p2' }],
    inventories: [
      { productId: 'p1', quantity: 10 },
      { productId: 'p2', quantity: 10 },
    ],
    suppliers: [
      {
        id: 'a',
        active: true,
        apiUrl: 'https://supplier-a.invalid/orders',
        orderAuthToken: 'TEST-a',
        orderWebhookToken: 'CALLBACK-a',
        orderForwardingEnabled: true,
      },
      {
        id: 'b',
        active: true,
        apiUrl: 'https://supplier-b.invalid/orders',
        orderAuthToken: 'TEST-b',
        orderWebhookToken: 'CALLBACK-b',
        orderForwardingEnabled: true,
      },
    ],
    serial: 0,
  };
  const copy = (v) => (v === undefined ? v : structuredClone(v));
  function matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return value.some((w) => matches(row, w));
      if (key === 'AND') return value.every((w) => matches(row, w));
      if (key === 'supplierId_supplierOrderId') return matches(row, value);
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (value.in) return value.in.includes(row[key]);
        if ('not' in value) return row[key] !== value.not;
        if ('gte' in value) return row[key] >= value.gte;
        if ('lt' in value) return row[key] < value.lt;
        return matches(row[key], value);
      }
      return row[key] instanceof Date && value instanceof Date
        ? +row[key] === +value
        : row[key] === value;
    });
  }
  function patch(row, data) {
    for (const [k, v] of Object.entries(data))
      row[k] =
        v && typeof v === 'object' && 'increment' in v
          ? (row[k] || 0) + v.increment
          : v && typeof v === 'object' && 'decrement' in v
            ? (row[k] || 0) - v.decrement
            : copy(v);
  }
  function api(s) {
    return {
      product: {
        findMany: async ({ where }) =>
          copy(s.products.filter((p) => where.id.in.includes(p.id))),
      },
      inventory: {
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const row of s.inventories)
            if (matches(row, where)) {
              patch(row, data);
              count++;
            }
          return { count };
        },
      },
      order: {
        findUnique: async ({ where, include }) => {
          const row = s.orders.find((r) => matches(r, where));
          if (!row) return null;
          return copy({
            ...row,
            ...(include?.dispatches
              ? {
                  dispatches: s.dispatches
                    .filter((d) => d.orderId === row.id)
                    .map((d) => ({
                      ...d,
                      supplier: s.suppliers.find((x) => x.id === d.supplierId),
                    })),
                }
              : {}),
          });
        },
        findFirst: async ({ where }) =>
          copy(s.orders.find((r) => matches(r, where)) || null),
        create: async ({ data }) => {
          if (
            s.orders.some(
              (o) => o.stripeCheckoutSessionId === data.stripeCheckoutSessionId,
            )
          )
            throw Object.assign(new Error('Unique session'), { code: 'P2002' });
          const row = {
            id: 'o' + ++s.serial,
            supplierStatus: 'pending',
            fulfillmentHold: null,
            ...copy(data),
            items: copy(data.items.create),
          };
          s.orders.push(row);
          return copy(row);
        },
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const row of s.orders)
            if (matches(row, where)) {
              patch(row, data);
              count++;
            }
          return { count };
        },
        update: async ({ where, data }) => {
          const row = s.orders.find((r) => matches(r, where));
          patch(row, data);
          return copy(row);
        },
      },
      supplier: {
        findUnique: async ({ where }) =>
          copy(s.suppliers.find((x) => matches(x, where)) || null),
      },
      supplierDispatch: {
        create: async ({ data }) => {
          if (!s.suppliers.some((p) => p.id === data.supplierId))
            throw new Error('Supplier foreign key');
          const row = {
            id: 'd' + ++s.serial,
            status: 'pending',
            supplierStatus: null,
            supplierOrderId: null,
            attempts: 0,
            lastAttemptAt: null,
            endpointUrl: null,
            ...copy(data),
          };
          s.dispatches.push(row);
          return copy(row);
        },
        findMany: async ({ where }) =>
          copy(s.dispatches.filter((r) => matches(r, where))),
        findUnique: async ({ where, include }) => {
          const row = s.dispatches.find((r) => matches(r, where));
          return row
            ? copy({
                ...row,
                ...(include?.order
                  ? { order: s.orders.find((o) => o.id === row.orderId) }
                  : {}),
              })
            : null;
        },
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const row of s.dispatches)
            if (matches(row, where)) {
              patch(row, data);
              count++;
            }
          return { count };
        },
      },
    };
  }
  const prisma = {};
  for (const model of [
    'order',
    'product',
    'inventory',
    'supplier',
    'supplierDispatch',
  ]) {
    prisma[model] = {};
    for (const method of Object.keys(api(state)[model]))
      prisma[model][method] = (...args) => api(state)[model][method](...args);
  }
  let queue = Promise.resolve();
  prisma.$transaction = (callback) => {
    const run = queue.then(async () => {
      const draft = copy(state);
      const result = await callback(api(draft));
      state = draft;
      return result;
    });
    queue = run.catch(() => {});
    return run;
  };
  return {
    prisma,
    get state() {
      return state;
    },
  };
}
const fixture = () => ({
  id: 'cs_test_ONLY_FIXTURE',
  mode: 'payment',
  status: 'complete',
  payment_status: 'paid',
  currency: 'eur',
  amount_total: 3497,
  payment_intent: 'pi_test_ONLY_FIXTURE',
  customer_details: { email: 'buyer@example.invalid', phone: '+38600000000' },
  shipping_details: {
    name: 'TEST recipient',
    address: {
      line1: 'TEST delivery street',
      line2: 'TEST door',
      city: 'TEST city',
      postal_code: '0000',
      country: 'SI',
      state: null,
    },
  },
  metadata: {
    checkout_version: '2',
    cart: JSON.stringify([
      {
        id: 'p1',
        title: 'TEST item A',
        priceCents: 1000,
        quantity: 2,
        supplierId: 'a',
        supplierProductId: 'a-001',
      },
      {
        id: 'p2',
        title: 'TEST item B',
        priceCents: 998,
        quantity: 1,
        supplierId: 'b',
        supplierProductId: 'b-002',
      },
    ]),
    firstName: 'TEST',
    lastName: 'fallback',
    street: 'TEST fallback address',
    city: 'TEST fallback city',
    postalCode: '1111',
    country: 'AT',
    phone: '+430000000',
  },
});
async function verify() {
  let count = 0;
  const check = (name, fn) => {
    fn();
    count++;
    console.log('PASS ' + name);
  };
  const pure = harness().load('src/lib/orderDelivery.ts');
  check('Stripe delivery address takes precedence over checkout metadata', () =>
    assert.equal(
      pure.sessionShippingAddress(fixture()).line1,
      'TEST delivery street',
    ),
  );
  check('confirmed address preserves optional second line and country', () => {
    const a = pure.sessionShippingAddress(fixture());
    assert.equal(a.line2, 'TEST door');
    assert.equal(a.country, 'SI');
  });
  check('legacy metadata delivery address remains readable', () => {
    const s = fixture();
    s.shipping_details = null;
    assert.equal(pure.sessionShippingAddress(s).line1, 'TEST fallback address');
  });
  check(
    'billing address is never substituted for a missing delivery address',
    () => {
      const s = fixture();
      s.shipping_details = null;
      s.metadata = {};
      s.customer_details.address = { line1: 'TEST billing' };
      assert.equal(pure.sessionShippingAddress(s), null);
    },
  );
  check(
    'incomplete Stripe delivery is held rather than silently replaced',
    () => {
      const s = fixture();
      s.shipping_details.address.postal_code = null;
      assert.equal(pure.sessionShippingAddress(s), null);
    },
  );
  check('unsettled and failed payments cannot trigger fulfilment', () => {
    assert.equal(
      pure.settledCheckout({ ...fixture(), payment_status: 'unpaid' }),
      false,
    );
    assert.equal(pure.settledCheckout({ ...fixture(), status: 'open' }), false);
  });
  check(
    'confirmed zero-value checkout is fulfilled without requiring a payment intent',
    () =>
      assert.equal(
        pure.settledCheckout({
          ...fixture(),
          payment_status: 'no_payment_required',
          amount_total: 0,
        }),
        true,
      ),
  );
  let db = database();
  let h = harness({ prisma: db.prisma });
  let record = h.load('src/lib/paidOrder.ts').recordPaidOrder;
  let saved = await record(fixture());
  check('paid orders persist the immutable delivery snapshot', () => {
    const o = db.state.orders[0];
    assert.equal(o.status, 'paid');
    assert.equal(JSON.parse(o.shippingAddressJson).line2, 'TEST door');
    assert.equal(o.stripeCheckoutSessionId, fixture().id);
  });
  check('mixed carts create separate durable dispatches per supplier', () => {
    assert.equal(db.state.dispatches.length, 2);
    const a = JSON.parse(
      db.state.dispatches.find((d) => d.supplierId === 'a').requestJson,
    );
    assert.equal(a.items.length, 1);
    assert.equal(a.items[0].supplierProductId, 'a-001');
    assert.equal(a.items[0].quantity, 2);
    assert.ok(!JSON.stringify(a).includes('b-002'));
  });
  await record({
    ...fixture(),
    shipping_details: {
      ...fixture().shipping_details,
      name: 'Changed after payment',
    },
  });
  check(
    'replayed payment does not duplicate order, inventory decrement or address',
    () => {
      assert.equal(db.state.orders.length, 1);
      assert.equal(db.state.inventories[0].quantity, 8);
      assert.equal(
        JSON.parse(db.state.orders[0].shippingAddressJson).name,
        'TEST recipient',
      );
    },
  );
  db = database();
  record = harness({ prisma: db.prisma }).load(
    'src/lib/paidOrder.ts',
  ).recordPaidOrder;
  await Promise.all([record(fixture()), record(fixture())]);
  check(
    'concurrent webhook delivery is deduplicated by the session uniqueness constraint',
    () => {
      assert.equal(db.state.orders.length, 1);
      assert.equal(db.state.inventories[0].quantity, 8);
    },
  );
  const legacy = db.state.orders[0];
  legacy.stripeCheckoutSessionId = null;
  await record(fixture());
  check(
    'replaying a pre-migration payment intent cannot create another order',
    () => assert.equal(db.state.orders.length, 1),
  );
  db = database();
  record = harness({ prisma: db.prisma }).load(
    'src/lib/paidOrder.ts',
  ).recordPaidOrder;
  const missing = fixture();
  missing.shipping_details = null;
  missing.metadata = { ...missing.metadata, street: '' };
  await record(missing);
  check(
    'missing delivery is saved for manual review with no outbound dispatch',
    () => {
      assert.match(db.state.orders[0].fulfillmentHold, /delivery-address/);
      assert.equal(db.state.dispatches.length, 0);
    },
  );
  db = database();
  db.state.inventories[0].quantity = 1;
  record = harness({ prisma: db.prisma }).load(
    'src/lib/paidOrder.ts',
  ).recordPaidOrder;
  await record(fixture());
  check(
    'stock shortage never makes inventory negative or dispatches automatically',
    () => {
      assert.equal(db.state.inventories[0].quantity, 1);
      assert.match(db.state.orders[0].fulfillmentHold, /inventory/);
      assert.equal(db.state.dispatches.length, 0);
    },
  );
  db = database();
  record = harness({ prisma: db.prisma }).load(
    'src/lib/paidOrder.ts',
  ).recordPaidOrder;
  const malformed = fixture();
  malformed.metadata.cart = '[]';
  await assert.rejects(() => record(malformed));
  check('invalid cart cannot create a paid order with no items', () =>
    assert.equal(db.state.orders.length, 0),
  );
  const old = fixture();
  delete old.metadata.checkout_version;
  await record(old);
  check(
    'legacy checkout requires supplier review instead of rerouting to current product supplier',
    () => {
      assert.match(db.state.orders[0].fulfillmentHold, /legacy/);
      assert.equal(db.state.dispatches.length, 0);
    },
  );
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  let calls = [];
  let forward = harness({
    prisma: db.prisma,
    env: {
      SUPPLIER_ORDER_URL: 'https://wrong.invalid',
      SUPPLIER_API_KEY: 'WRONG',
    },
    fetchMock: async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({ id: 'supplier-order-' + calls.length }),
      );
    },
  }).load('src/lib/supplierForward.ts').forwardOrderToSupplier;
  await forward(db.state.orders[0].id);
  check(
    'each supplier uses its own endpoint, dedicated key and only its own items',
    () => {
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, 'https://supplier-a.invalid/orders');
      assert.equal(calls[0].options.headers.Authorization, 'Bearer TEST-a');
      const body = JSON.parse(calls[0].options.body);
      assert.equal(body.items[0].supplierProductId, 'a-001');
      assert.equal(body.shippingAddress.line1, 'TEST delivery street');
      assert.ok(!('totalCents' in body));
      assert.equal(calls[1].url, 'https://supplier-b.invalid/orders');
    },
  );
  await forward(db.state.orders[0].id);
  check(
    'confirmed supplier dispatch is never resent on webhook replay or retry',
    () => assert.equal(calls.length, 2),
  );
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  db.state.suppliers[1].orderForwardingEnabled = false;
  calls = [];
  let failing = true;
  forward = harness({
    prisma: db.prisma,
    fetchMock: async (url, options) => {
      calls.push(options);
      return failing
        ? new Response('', { status: 503 })
        : new Response(JSON.stringify({ id: 'accepted' }));
    },
  }).load('src/lib/supplierForward.ts').forwardOrderToSupplier;
  let result = await forward(db.state.orders[0].id);
  failing = false;
  await forward(db.state.orders[0].id);
  check(
    'transient failure keeps one dispatch and retries with identical reference and idempotency key',
    () => {
      assert.equal(result.retryable, true);
      assert.equal(calls.length, 2);
      assert.equal(
        calls[0].headers['Idempotency-Key'],
        calls[1].headers['Idempotency-Key'],
      );
      assert.equal(calls[0].body, calls[1].body);
      assert.equal(db.state.dispatches[0].attempts, 2);
    },
  );
  check(
    'unconfigured or disabled suppliers receive no requests and remain visible as pending',
    () => {
      assert.equal(db.state.dispatches[1].status, 'pending');
      assert.equal(
        db.state.dispatches[1].lastError,
        'supplier-order-api-not-configured',
      );
    },
  );
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  db.state.suppliers[1].orderForwardingEnabled = false;
  calls = [];
  forward = harness({
    prisma: db.prisma,
    fetchMock: async (url, options) => {
      calls.push(options);
      return new Response('{}');
    },
  }).load('src/lib/supplierForward.ts').forwardOrderToSupplier;
  await forward(db.state.orders[0].id);
  await forward(db.state.orders[0].id);
  check(
    'ambiguous success without supplier ID is held for review without blind retries',
    () => {
      assert.equal(calls.length, 1);
      assert.equal(db.state.dispatches[0].status, 'needs_review');
    },
  );
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  db.state.suppliers[1].orderForwardingEnabled = false;
  db.state.dispatches[0].endpointUrl = 'https://old-supplier.invalid/orders';
  calls = [];
  forward = harness({
    prisma: db.prisma,
    fetchMock: async () => {
      calls.push(1);
      throw new Error('unexpected');
    },
  }).load('src/lib/supplierForward.ts').forwardOrderToSupplier;
  await forward(db.state.orders[0].id);
  check(
    'changing endpoint after an attempt requires review and cannot reroute customer data',
    () => {
      assert.equal(calls.length, 0);
      assert.equal(db.state.dispatches[0].status, 'needs_review');
    },
  );
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  db.state.suppliers[1].orderForwardingEnabled = false;
  calls = [];
  forward = harness({
    prisma: db.prisma,
    fetchMock: async () => {
      calls.push(1);
      await new Promise((r) => setTimeout(r, 5));
      return new Response('{"id":"one-only"}');
    },
  }).load('src/lib/supplierForward.ts').forwardOrderToSupplier;
  await Promise.all([
    forward(db.state.orders[0].id),
    forward(db.state.orders[0].id),
  ]);
  check(
    'concurrent forwarding claims prevent simultaneous duplicate supplier requests',
    () => assert.equal(calls.length, 1),
  );
  const api = harness().load('src/lib/supplierOrderApi.ts');
  check(
    'order endpoint rejects credentials, query secrets, placeholders and insecure URLs',
    () => {
      for (const url of [
        'http://vendor.invalid',
        'https://a:b@vendor.invalid',
        'https://vendor.invalid?token=x',
        'https://example.com/orders',
      ])
        assert.equal(api.validOrderEndpoint(url), false);
      assert.equal(
        api.validOrderEndpoint('https://vendor.invalid/orders'),
        true,
      );
    },
  );
  db.state.orders[0].status = 'refunded';
  await forward(db.state.orders[0].id);
  check('refunded orders cannot be forwarded', () =>
    assert.equal(calls.length, 1),
  );
  // Callback is scoped to supplier + order ID; repeated or older notifications do not send duplicate emails.
  db = database();
  await harness({ prisma: db.prisma })
    .load('src/lib/paidOrder.ts')
    .recordPaidOrder(fixture());
  for (const d of db.state.dispatches) {
    d.status = 'sent';
    d.supplierOrderId = 'same-id-at-both';
    d.supplierStatus = 'confirmed';
  }
  const callbackDb = db;
  let emails = 0;
  const callback = harness({
    prisma: db.prisma,
    emails: {
      sendShippingUpdate: async () => {
        emails++;
      },
    },
  }).load('src/app/api/supplier-webhook/route.ts').POST;
  const notify = (supplierId, token, status = 'shipped') =>
    callback(
      new Request('https://store.invalid/api/supplier-webhook', {
        method: 'POST',
        headers: {
          'x-supplier-id': supplierId,
          'x-api-key': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierOrderId: 'same-id-at-both',
          status,
          trackingNumber: 'TEST-TRACKING',
        }),
      }),
    );
  let res = await notify('a', 'CALLBACK-b');
  check('another supplier callback token cannot update an order', () =>
    assert.equal(res.status, 401),
  );
  await notify('a', 'CALLBACK-a');
  check('same external order IDs remain scoped to their supplier', () => {
    assert.equal(db.state.dispatches[0].supplierStatus, 'shipped');
    assert.equal(db.state.dispatches[1].supplierStatus, 'confirmed');
  });
  await notify('a', 'CALLBACK-a');
  await notify('a', 'CALLBACK-a', 'pending');
  check(
    'duplicate and older shipping callbacks neither regress state nor repeat shipping email',
    () => {
      assert.equal(db.state.dispatches[0].supplierStatus, 'shipped');
      assert.equal(emails, 1);
    },
  );

  db = database();
  const Stripe = require('stripe');
  const realStripe = new Stripe('sk_test_FIXTURE_ONLY');
  let current = fixture();
  let paymentEmails = 0;
  let retrieves = 0;
  class StripeMock {
    constructor() {
      this.webhooks = realStripe.webhooks;
      this.checkout = {
        sessions: {
          retrieve: async () => {
            retrieves++;
            return current;
          },
        },
      };
    }
  }
  const webhookEnv = {
    STRIPE_SECRET_KEY: 'sk_test_FIXTURE_ONLY',
    STRIPE_WEBHOOK_SECRET: 'whsec_FIXTURE_ONLY',
  };
  const routeHarness = harness({
    prisma: db.prisma,
    stripeMock: StripeMock,
    env: webhookEnv,
    emails: {
      sendOrderConfirmation: async () => {
        paymentEmails++;
      },
    },
  });
  const webhook = routeHarness.load('src/app/api/stripe-webhook/route.ts').POST;
  const eventBody = (type) =>
    JSON.stringify({
      id: 'evt_FIXTURE_ONLY',
      object: 'event',
      type,
      data: { object: { id: fixture().id } },
    });
  const request = (type, valid = true) => {
    const payload = eventBody(type);
    const signature = realStripe.webhooks.generateTestHeaderString({
      payload,
      secret: valid ? webhookEnv.STRIPE_WEBHOOK_SECRET : 'wrong-fixture-secret',
    });
    return new Request('https://store.invalid/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    });
  };
  res = await webhook(request('checkout.session.completed', false));
  check(
    'invalid Stripe signatures cannot read sessions or create orders',
    () => {
      assert.equal(res.status, 400);
      assert.equal(retrieves, 0);
      assert.equal(db.state.orders.length, 0);
    },
  );
  current = { ...fixture(), payment_status: 'unpaid' };
  res = await webhook(request('checkout.session.completed'));
  check(
    'completed checkout with delayed unpaid payment saves no order or dispatch',
    () => {
      assert.equal(res.status, 200);
      assert.equal(db.state.orders.length, 0);
    },
  );
  for (const s of db.state.suppliers) s.orderForwardingEnabled = false;
  current = fixture();
  res = await webhook(request('checkout.session.async_payment_succeeded'));
  check(
    'delayed-payment success saves order and delivery through the signed webhook',
    () => {
      assert.equal(res.status, 200);
      assert.equal(db.state.orders.length, 1);
      assert.equal(paymentEmails, 1);
    },
  );
  await webhook(request('checkout.session.completed'));
  check(
    'completed and async success for the same payment send one order confirmation',
    () => {
      assert.equal(paymentEmails, 1);
      assert.equal(db.state.orders.length, 1);
      assert.equal(db.state.inventories[0].quantity, 8);
    },
  );
  const demoHook = harness({
    prisma: db.prisma,
    stripeMock: StripeMock,
    env: { ...webhookEnv, NEXT_PUBLIC_MOCK_MODE: 'true' },
  }).load('src/app/api/stripe-webhook/route.ts').POST;
  res = await demoHook(request('checkout.session.completed'));
  check('demo mode blocks webhook writes and supplier delivery', () =>
    assert.equal(res.status, 409),
  );
  callbackDb.state.orders[0].supplierStatus = 'refunded';
  await notify('b', 'CALLBACK-b');
  check(
    'supplier callbacks cannot reopen an order blocked by a financial refund',
    () => assert.equal(callbackDb.state.orders[0].supplierStatus, 'refunded'),
  );
  console.log(count + ' dropshipping checks passed');
}
verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
