import { enqueueTrackingNotification } from '@/lib/trackingNotifications';
import {
  resolveHeldOrder,
  recordSupplierReconciliation,
} from '@/lib/orderResolution';
import { shippingAddressSchema } from '@/lib/orderDelivery';
import { prisma } from '@/lib/prisma';
import { forwardOrderToSupplier } from '@/lib/supplierForward';
import { revalidatePath } from 'next/cache';
import { formatCurrencyCents } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { readShippingAddress } from '@/lib/orderDelivery';
import { requestOrderRefund } from '@/lib/refunds';
import { randomUUID } from 'node:crypto';

async function retryForward(formData: FormData) {
  'use server';
  await requireAdmin();
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');

  try {
    await forwardOrderToSupplier(id, { force: true });
    revalidatePath(`/${locale}/admin/orders`);
  } catch (error: any) {
    console.error('Retry forward error:', error);
  }
}

async function refundOrder(formData: FormData) {
  'use server';
  const session = await requireAdmin();
  const lang = formData.get('locale') === 'en' ? 'en' : 'sl';
  let notice = 'refund-requested';
  try {
    await requestOrderRefund(
      {
        orderId: String(formData.get('orderId')),
        requestId: String(formData.get('requestId')),
      },
      (session.user as { id: string }).id,
    );
  } catch {
    notice = 'refund-review';
  }
  revalidatePath('/' + lang + '/admin/orders');
  redirect('/' + lang + '/admin/orders?notice=' + notice);
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string; search?: string; notice?: string };
}) {
  await requireAdmin();
  const locale = params.locale === 'en' ? 'en' : 'sl';
  const statusFilter = searchParams.status;
  const searchQuery = searchParams.search?.trim();

  const where: any = {};
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  }
  if (searchQuery) {
    where.OR = [
      { email: { contains: searchQuery, mode: 'insensitive' } },
      { id: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      refunds: true,
      dispatches: { include: { supplier: { select: { name: true } } } },
    },
  });

  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const reservationReviews = await prisma.checkoutReservation.findMany({
    where: { status: 'needs_review' },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  const alerts = await prisma.operationsAlert.findMany({
    where: { acknowledgedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return (
    <div className="space-y-6">
      {reservationReviews.length > 0 && (
        <section className="p-4 border rounded">
          <h2 className="font-bold">Rezervacije za ročni pregled</h2>
          <p>
            Preveri identiteto seje v Stripe. Pretek časa sam ne sprosti
            rezervirane zaloge.
          </p>
          {reservationReviews.map((r) => (
            <div key={r.id} className="mt-2">
              <code>{r.id}</code>
              <p>
                Stripe: {r.stripeSessionId || 'še ni potrjen'} ·{' '}
                {r.reconciliationError || 'potreben pregled'} · Poskusi:{' '}
                {r.reconcileAttempts}
              </p>
            </div>
          ))}
        </section>
      )}
      {searchParams.notice && (
        <p role="status">
          {searchParams.notice === 'refund-requested'
            ? 'Vračilo je zabeleženo; preveri stanje vračila in uskladitev dobavitelja.'
            : 'Potrebna je obravnava skrbnika; preveri podatke in stanje.'}
        </p>
      )}
      {alerts.length > 0 && (
        <section className="p-4 border rounded">
          <h2 className="font-bold">Operativna opozorila ({alerts.length})</h2>
          {alerts.map((a) => (
            <form
              action={acknowledgeAlert}
              key={a.id}
              className="flex gap-3 mt-2"
            >
              <span>
                {a.code} · {a.orderId || a.dispatchId || '—'}
              </span>
              <input type="hidden" name="id" value={a.id} />
              <button className="border rounded px-2">
                Označi kot pregledano
              </button>
            </form>
          ))}
        </section>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-sm text-gray-600">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex gap-2 flex-wrap">
          <FilterButton
            href={`/${locale}/admin/orders`}
            active={!statusFilter || statusFilter === 'all'}
          >
            All ({statusCounts.reduce((sum, s) => sum + s._count.status, 0)})
          </FilterButton>
          {statusCounts.map((s) => (
            <FilterButton
              key={s.status}
              href={`/${locale}/admin/orders?status=${s.status}`}
              active={statusFilter === s.status}
            >
              {s.status} ({s._count.status})
            </FilterButton>
          ))}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={statusFilter || 'all'} />
          <input
            type="search"
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by email or order ID..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-3 px-4 font-semibold">Created</th>
              <th className="py-3 px-4 font-semibold">Email / Dostava</th>
              <th className="py-3 px-4 font-semibold">Total</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Supplier</th>
              <th className="py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(o.createdAt).toLocaleDateString('sl-SI', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <p>{o.email}</p>
                    <DeliveryAddress json={o.shippingAddressJson} />
                    <p>Vračilo: {o.refundState}</p>
                    {o.fulfillmentHold && (
                      <HoldResolution
                        orderId={o.id}
                        json={o.shippingAddressJson}
                      />
                    )}
                    {o.fulfillmentHold && (
                      <p className="text-red-700 mt-2">
                        {locale === 'en'
                          ? 'Manual review required'
                          : 'Potreben je ročni pregled'}
                        : {o.fulfillmentHold}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {formatCurrencyCents(o.totalCents, 'sl-SI')}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === 'paid' || o.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : o.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : o.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {o.dispatches.length ? (
                      o.dispatches.map((d) => (
                        <div key={d.id} className="mb-3">
                          <strong>{d.supplier.name}</strong>
                          <p>
                            {d.status} · {d.supplierStatus || '—'}
                          </p>
                          {d.supplierOrderId && <p>ID: {d.supplierOrderId}</p>}
                          {d.trackingNumber && (
                            <p>
                              {locale === 'en' ? 'Tracking' : 'Sledenje'}:{' '}
                              {d.trackingNumber}
                            </p>
                          )}
                          {d.labelUrl && (
                            <a
                              href={d.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Odpri nalepko dobavitelja
                            </a>
                          )}
                          <p>Uskladitev: {d.reconciliationStatus}</p>
                          <p>
                            Naslednji poskus:{' '}
                            {d.nextAttemptAt.toLocaleString('sl-SI')}
                          </p>
                          <SupplierReconciliation dispatchId={d.id} />
                          {d.trackingNumber && (
                            <form action={queueTrackingNotice}>
                              <input
                                type="hidden"
                                name="dispatchId"
                                value={d.id}
                              />
                              <button className="border rounded px-2 mt-2">
                                Pripravi obvestilo o sledenju
                              </button>
                            </form>
                          )}
                          {d.lastError && (
                            <p className="text-red-700">{d.lastError}</p>
                          )}
                          <p>
                            {locale === 'en' ? 'Attempts' : 'Poskusi'}:{' '}
                            {d.attempts}
                          </p>
                        </div>
                      ))
                    ) : (
                      <span>{o.supplierStatus || '—'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <form action={retryForward}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          disabled={
                            o.status !== 'paid' ||
                            !!o.fulfillmentHold ||
                            !o.stripeCheckoutSessionId
                          }
                          className="disabled:opacity-40 border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors text-xs"
                        >
                          Retry
                        </button>
                      </form>
                      <form action={refundOrder}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <input
                          type="hidden"
                          name="requestId"
                          value={randomUUID()}
                        />
                        <input type="hidden" name="locale" value={locale} />
                        <button className="border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors text-xs">
                          Refund
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </a>
  );
}

function DeliveryAddress({ json }: { json: string | null }) {
  const a = readShippingAddress(json);
  if (!a)
    return (
      <p className="text-amber-800 mt-2">
        Dostavni naslov ni potrjen / Delivery address not confirmed
      </p>
    );
  return (
    <address className="not-italic text-gray-600 mt-2">
      <p>{a.name}</p>
      <p>{a.line1}</p>
      {a.line2 && <p>{a.line2}</p>}
      <p>
        {a.postalCode} {a.city}
      </p>
      <p>{[a.state, a.country].filter(Boolean).join(', ')}</p>
      <p>{a.phone}</p>
    </address>
  );
}

async function acknowledgeAlert(form: FormData) {
  'use server';
  await requireAdmin();
  await prisma.operationsAlert.update({
    where: { id: String(form.get('id')) },
    data: { acknowledgedAt: new Date() },
  });
  revalidatePath('/sl/admin/orders');
  revalidatePath('/en/admin/orders');
}
async function resolveHold(form: FormData) {
  'use server';
  const session = await requireAdmin();
  const mode =
    form.get('resolution') === 'manual_fulfilled'
      ? 'manual_fulfilled'
      : 'address';
  const address =
    mode === 'address'
      ? shippingAddressSchema.parse(
          Object.fromEntries(
            [
              'name',
              'line1',
              'line2',
              'city',
              'postalCode',
              'state',
              'country',
              'phone',
              'firstName',
              'lastName',
              'streetName',
              'streetNumber1',
              'streetNumber2',
            ].map((key) => [key, String(form.get(key) || '')]),
          ),
        )
      : undefined;
  await resolveHeldOrder(
    String(form.get('orderId')),
    mode,
    String(form.get('evidence')),
    (session.user as { id: string }).id,
    address,
  );
  revalidatePath('/sl/admin/orders');
  revalidatePath('/en/admin/orders');
}
async function reconcileSupplier(form: FormData) {
  'use server';
  const session = await requireAdmin();
  const resolution = String(form.get('resolution'));
  if (
    !['cancel_confirmed', 'return_confirmed', 'stock_included'].includes(
      resolution,
    )
  )
    throw new Error('Invalid reconciliation');
  await recordSupplierReconciliation(
    String(form.get('dispatchId')),
    resolution as 'cancel_confirmed' | 'return_confirmed' | 'stock_included',
    String(form.get('evidence')),
    (session.user as { id: string }).id,
  );
  revalidatePath('/sl/admin/orders');
  revalidatePath('/en/admin/orders');
}
function HoldResolution({
  orderId,
  json,
}: {
  orderId: string;
  json: string | null;
}) {
  const a = readShippingAddress(json);
  const fields = [
    ['name', 'Prejemnik'],
    ['line1', 'Ulica in hišna številka'],
    ['line2', 'Druga vrstica naslova'],
    ['postalCode', 'Poštna številka'],
    ['city', 'Kraj'],
    ['state', 'Regija'],
    ['country', 'Država (SI/AT/DE/HR/IT)'],
    ['phone', 'Telefon'],
    ['firstName', 'Ime'],
    ['lastName', 'Priimek'],
    ['streetName', 'Ime ulice za Ikonko'],
    ['streetNumber1', 'Hišna številka za Ikonko'],
    ['streetNumber2', 'Stanovanje za Ikonko'],
  ];
  return (
    <details className="mt-3">
      <summary>Razreši zadržanje</summary>
      <form action={resolveHold} className="space-y-2 mt-2">
        <input type="hidden" name="orderId" value={orderId} />
        <label>
          Odločitev
          <select name="resolution" className="border block">
            <option value="address">Popravi naslov pred prvim poskusom</option>
            <option value="manual_fulfilled">
              Dokazano izpolnjeno ročno; ustavi avtomatiko
            </option>
          </select>
        </label>
        {fields.map(([key, label]) => (
          <label key={key} className="block text-xs">
            {label}
            <input
              name={key}
              className="border rounded block w-full"
              defaultValue={a?.[key as keyof typeof a] || ''}
            />
          </label>
        ))}
        <label className="block text-xs">
          Razlog in dokazilo
          <textarea
            name="evidence"
            required
            minLength={12}
            className="border block w-full"
          />
        </label>
        <button className="border rounded px-3 py-1">Shrani odločitev</button>
      </form>
      <p className="text-xs">
        Za nedobavljivo naročilo uporabi vračilo plačila. Sprememba naslova ne
        odpravi drugih zadržanj.
      </p>
    </details>
  );
}
function SupplierReconciliation({ dispatchId }: { dispatchId: string }) {
  return (
    <details className="mt-2">
      <summary>Uskladitev dobavitelja</summary>
      <form action={reconcileSupplier} className="space-y-2">
        <input type="hidden" name="dispatchId" value={dispatchId} />
        <label>
          Potrditev
          <select name="resolution" className="border block">
            <option value="cancel_confirmed">
              Prekliči neposredovano / potrdi preklic dobavitelja
            </option>
            <option value="return_confirmed">
              Dobavitelj je potrdil prejem vračila
            </option>
            <option value="stock_included">
              Svež vir zaloge že vključuje to naročilo
            </option>
          </select>
        </label>
        <label>
          Dokazilo / referenca
          <textarea
            name="evidence"
            required
            minLength={12}
            className="border block w-full"
          />
        </label>
        <button className="border rounded px-2">Zabeleži uskladitev</button>
      </form>
    </details>
  );
}

async function queueTrackingNotice(form: FormData) {
  'use server';
  const session = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const dispatch = await tx.supplierDispatch.findUniqueOrThrow({
      where: { id: String(form.get('dispatchId')) },
    });
    if (!dispatch.trackingNumber) throw new Error('Tracking number required');
    await enqueueTrackingNotification(tx, dispatch.id, dispatch.trackingNumber);
    await tx.auditLog.create({
      data: {
        userId: (session.user as { id: string }).id,
        action: 'tracking.notification.queued',
        metadata: JSON.stringify({
          orderId: dispatch.orderId,
          dispatchId: dispatch.id,
        }),
      },
    });
  });
  revalidatePath('/sl/admin/orders');
  revalidatePath('/en/admin/orders');
}
