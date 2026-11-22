import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/requireAdmin';
import { runSupplierSync } from '@/lib/supplierSync';
import { validOrderEndpoint } from '@/lib/supplierOrderApi';
const formSchema = z.object({
  name: z.string().trim().min(1).max(250),
  feedUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    }),
  frequency: z.enum(['@hourly', '@daily']),
});
const value = (f: FormData, key: string) => String(f.get(key) || '').trim();
const locale = (f: FormData) => (f.get('locale') === 'en' ? 'en' : 'sl');
async function saveSupplier(form: FormData) {
  'use server';
  await requireAdmin();
  const lang = locale(form);
  const target = '/' + lang + '/admin/suppliers';
  const parsed = formSchema.safeParse({
    name: value(form, 'name'),
    feedUrl: value(form, 'feedUrl'),
    frequency: value(form, 'syncFrequency') || '@daily',
  });
  if (!parsed.success) redirect(target + '?notice=invalid');
  const id = value(form, 'id');
  const token = value(form, 'authToken');
  const active = form.get('active') === 'on';
  const apiUrl = value(form, 'apiUrl');
  const orderToken = value(form, 'orderAuthToken');
  const webhookToken = value(form, 'orderWebhookToken');
  const orderForwardingEnabled = form.get('orderForwardingEnabled') === 'on';
  const previous = id
    ? await prisma.supplier.findUnique({ where: { id } })
    : null;
  const finalOrderToken =
    form.get('clearOrderToken') === 'on'
      ? null
      : orderToken || previous?.orderAuthToken || null;
  const finalWebhookToken =
    form.get('clearWebhookToken') === 'on'
      ? null
      : webhookToken || previous?.orderWebhookToken || null;
  if (
    (apiUrl && !validOrderEndpoint(apiUrl)) ||
    (orderForwardingEnabled && (!apiUrl || !finalOrderToken))
  )
    redirect(target + '?notice=order-api-invalid');
  const data = {
    name: parsed.data.name,
    feedUrl: parsed.data.feedUrl,
    syncFrequency: parsed.data.frequency,
    active,
    apiUrl: apiUrl || null,
    orderAuthToken: finalOrderToken,
    orderWebhookToken: finalWebhookToken,
    orderForwardingEnabled,
    ...(token ? { authToken: token } : {}),
  };
  if (id) {
    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({ where: { id }, data });
      if (!active)
        await tx.product.updateMany({
          where: { supplierId: id, supplierManaged: true },
          data: { active: false },
        });
    });
  } else await prisma.supplier.create({ data });
  revalidatePath(target);
  redirect(target + '?notice=saved');
}
async function syncNow(form: FormData) {
  'use server';
  await requireAdmin();
  const target = '/' + locale(form) + '/admin/suppliers';
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    redirect(target + '?notice=demo');
  let failed = false;
  try {
    const result = await runSupplierSync();
    failed = result.errors > 0;
  } catch {
    failed = true;
  }
  revalidatePath(target);
  redirect(target + '?notice=' + (failed ? 'sync-error' : 'synced'));
}
export default async function SuppliersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { notice?: string };
}) {
  await requireAdmin();
  const lang = params.locale === 'en' ? 'en' : 'sl';
  const en = lang === 'en';
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const notices: Record<string, string> = {
    'order-api-invalid': en
      ? 'Enter a real HTTPS order endpoint without credentials/query strings and a dedicated order token before enabling forwarding.'
      : 'Pred vklopom posredovanja vnesi pravi HTTPS naslov za naročila brez ključev v povezavi in ločen ključ za naročila.',
    invalid: en
      ? 'Enter a supplier name and valid HTTPS feed.'
      : 'Vnesi naziv dobavitelja in veljaven vir HTTPS.',
    saved: en ? 'Supplier saved.' : 'Dobavitelj je shranjen.',
    demo: en
      ? 'Sync is disabled in demo mode. Use the CLI dry run to inspect the feed.'
      : 'Sinhronizacija je v predstavitvenem načinu izklopljena. Vir lahko preveriš s poskusnim uvozom CLI.',
    synced: en ? 'Supplier sync completed.' : 'Sinhronizacija je končana.',
    'sync-error': en
      ? 'A supplier feed failed. Existing products for that failed import were retained; check sync logs.'
      : 'Pri uvozu je prišlo do napake. Obstoječi izdelki neuspešnega uvoza so ohranjeni; preveri dnevnik.',
  };
  return (
    <div className="catalog-admin">
      <h1 className="text-2xl font-semibold">
        {en ? 'Suppliers' : 'Dobavitelji'}
      </h1>
      {searchParams.notice && notices[searchParams.notice] && (
        <p role="status" className="admin-message">
          {notices[searchParams.notice]}
        </p>
      )}
      <article>
        <h2>{en ? 'Add supplier' : 'Dodaj dobavitelja'}</h2>
        <form action={saveSupplier}>
          <input type="hidden" name="locale" value={lang} />
          <div className="admin-grid">
            <label>
              {en ? 'Supplier name' : 'Naziv dobavitelja'}
              <input name="name" required />
            </label>
            <label>
              {en ? 'Feed URL' : 'Vir kataloga'}
              <input
                name="feedUrl"
                type="url"
                required
                placeholder="https://"
              />
            </label>
            <label>
              {en ? 'Access key' : 'Dostopni ključ'}
              <input
                name="authToken"
                type="password"
                autoComplete="new-password"
              />
            </label>
            <label>
              {en ? 'Frequency' : 'Pogostost'}
              <select name="syncFrequency" defaultValue="@daily">
                <option value="@hourly">{en ? 'Hourly' : 'Vsako uro'}</option>
                <option value="@daily">{en ? 'Daily' : 'Dnevno'}</option>
              </select>
            </label>
          </div>
          <OrderApiFields en={en} />
          <label className="admin-check">
            <input name="active" type="checkbox" defaultChecked />
            {en ? 'Enabled' : 'Omogočen'}
          </label>
          <button className="primary-btn">
            {en ? 'Add supplier' : 'Dodaj dobavitelja'}
          </button>
        </form>
      </article>
      <form action={syncNow}>
        <input type="hidden" name="locale" value={lang} />
        <button className="secondary-btn">
          {en
            ? 'Sync configured suppliers'
            : 'Sinhroniziraj nastavljene dobavitelje'}
        </button>
      </form>
      {suppliers.map((s) => (
        <article key={s.id}>
          <h2>{s.name}</h2>
          <p className="admin-meta">
            ID: {s.id}
            <br />
            {en
              ? 'Use this ID for category mappings in config/supplier-categories.json.'
              : 'Ta ID uporabi za preslikave kategorij v config/supplier-categories.json.'}
          </p>
          <form action={saveSupplier}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="locale" value={lang} />
            <div className="admin-grid">
              <label>
                {en ? 'Supplier name' : 'Naziv dobavitelja'}
                <input name="name" required defaultValue={s.name} />
              </label>
              <label>
                {en ? 'Feed URL' : 'Vir kataloga'}
                <input
                  name="feedUrl"
                  type="url"
                  required
                  defaultValue={s.feedUrl || ''}
                />
              </label>
              <label>
                {en
                  ? 'Replace access key (empty keeps current)'
                  : 'Zamenjaj ključ (prazno ohrani trenutnega)'}
                <input
                  name="authToken"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
              <label>
                {en ? 'Frequency' : 'Pogostost'}
                <select
                  name="syncFrequency"
                  defaultValue={s.syncFrequency || '@daily'}
                >
                  <option value="@hourly">{en ? 'Hourly' : 'Vsako uro'}</option>
                  <option value="@daily">{en ? 'Daily' : 'Dnevno'}</option>
                </select>
              </label>
            </div>
            <OrderApiFields
              en={en}
              endpoint={s.apiUrl}
              enabled={s.orderForwardingEnabled}
            />
            <label className="admin-check">
              <input name="active" type="checkbox" defaultChecked={s.active} />
              {en
                ? 'Enabled; disabling also hides this supplier’s products'
                : 'Omogočen; izklop skrije tudi izdelke tega dobavitelja'}
            </label>
            <button className="primary-btn">
              {en ? 'Save supplier' : 'Shrani dobavitelja'}
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}

function OrderApiFields({
  en,
  endpoint,
  enabled = false,
}: {
  en: boolean;
  endpoint?: string | null;
  enabled?: boolean;
}) {
  return (
    <fieldset className="space-y-4 mt-6">
      <legend className="font-semibold">
        {en ? 'Order forwarding' : 'Posredovanje naročil'}
      </legend>
      <p className="admin-meta">
        {en
          ? 'Enable only after testing the v1 order contract and durable Idempotency-Key support with this supplier. Feed credentials are separate.'
          : 'Vklopi po preizkusu pogodbe naročil v1 in trajnega preprečevanja dvojnih naročil z Idempotency-Key pri tem dobavitelju. Ključ kataloga je ločen.'}
      </p>
      <div className="admin-grid">
        <label>
          {en ? 'Order endpoint (HTTPS)' : 'Naslov API za naročila (HTTPS)'}
          <input name="apiUrl" type="url" defaultValue={endpoint || ''} />
        </label>
        <label>
          {en
            ? 'Order API token (empty keeps saved)'
            : 'Ključ za naročila (prazno ohrani shranjenega)'}
          <input
            name="orderAuthToken"
            type="password"
            autoComplete="new-password"
            maxLength={2000}
          />
        </label>
        <label>
          {en
            ? 'Callback token (empty keeps saved)'
            : 'Ključ povratnih obvestil (prazno ohrani shranjenega)'}
          <input
            name="orderWebhookToken"
            type="password"
            autoComplete="new-password"
            maxLength={2000}
          />
        </label>
      </div>
      <label className="admin-check">
        <input name="clearOrderToken" type="checkbox" />
        {en
          ? 'Remove saved order token'
          : 'Odstrani shranjen ključ za naročila'}
      </label>
      <label className="admin-check">
        <input name="clearWebhookToken" type="checkbox" />
        {en
          ? 'Remove saved callback token'
          : 'Odstrani shranjen ključ povratnih obvestil'}
      </label>
      <label className="admin-check">
        <input
          name="orderForwardingEnabled"
          type="checkbox"
          defaultChecked={enabled}
        />
        {en
          ? 'Enable forwarding; the supplier supports the tested v1 contract and stable idempotency keys.'
          : 'Omogoči posredovanje; dobavitelj podpira preizkušeno pogodbo v1 in stalne ključe za preprečevanje podvojenih naročil.'}
      </label>
    </fieldset>
  );
}
