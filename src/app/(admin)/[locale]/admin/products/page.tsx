import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { CATEGORIES } from '@/lib/catalog';
import {
  parseProductDetails,
  productDetailsSchema,
  reviewIssues,
} from '@/lib/productDetails';
import { safeParseJsonArray } from '@/lib/utils';
import { z } from 'zod';
const imageSchema = z
  .array(
    z
      .string()
      .url()
      .refine((url) => new URL(url).protocol === 'https:'),
  )
  .max(20);
const text = (form: FormData, key: string) =>
  String(form.get(key) || '').trim();
const optionalMonths = (form: FormData, key: string) =>
  text(form, key) === '' ? null : Number(text(form, key));
const localeOf = (form: FormData) =>
  form.get('locale') === 'en' ? 'en' : 'sl';
async function saveProduct(form: FormData) {
  'use server';
  await requireAdmin();
  const locale = localeOf(form);
  const target = '/' + locale + '/admin/products';
  const product = await prisma.product.findUnique({
    where: { id: text(form, 'id') },
  });
  if (!product) redirect(target + '?notice=not-found');
  const basic = z
    .object({
      title: z.string().min(1).max(500),
      priceCents: z.number().int().positive(),
      categoryPath: z
        .string()
        .refine((value) => !value || CATEGORIES.some((c) => c.id === value)),
    })
    .safeParse({
      title: text(form, 'title'),
      priceCents: Number(text(form, 'priceCents')),
      categoryPath: text(form, 'categoryPath'),
    });
  const details = productDetailsSchema.safeParse({
    minAgeMonths: optionalMonths(form, 'minAgeMonths'),
    maxAgeMonths: optionalMonths(form, 'maxAgeMonths'),
    ageLabel: text(form, 'ageLabel'),
    warnings: text(form, 'warnings'),
    instructionsUrl: text(form, 'instructionsUrl'),
    instructionsLanguage: text(form, 'instructionsLanguage'),
    manufacturer: {
      name: text(form, 'manufacturerName'),
      address: text(form, 'manufacturerAddress'),
      email: text(form, 'manufacturerEmail'),
    },
    euResponsiblePerson: {
      name: text(form, 'responsiblePersonName'),
      address: text(form, 'responsiblePersonAddress'),
      email: text(form, 'responsiblePersonEmail'),
    },
    sourceUrl: text(form, 'sourceUrl'),
    imageRightsSource: text(form, 'imageRightsSource'),
  });
  const images = imageSchema.safeParse(
    text(form, 'images')
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean),
  );
  if (!basic.success || !details.success || !images.success)
    redirect(target + '?notice=invalid');
  const oldDetails = parseProductDetails(product.detailsJson);
  const imagesChanged =
    JSON.stringify(images.data) !==
      JSON.stringify(safeParseJsonArray(product.imagesJson)) ||
    details.data.imageRightsSource !== oldDetails.imageRightsSource;
  const imageDate = imagesChanged
    ? form.get('imagesConfirmed') === 'on'
      ? new Date()
      : null
    : product.imagesVerifiedAt ||
      (form.get('imagesConfirmed') === 'on' ? new Date() : null);
  const wantsActive = form.get('active') === 'on';
  const issues = reviewIssues(details.data, images.data, !!imageDate);
  if (!basic.data.categoryPath) issues.push('category');
  if (wantsActive && (form.get('contentConfirmed') !== 'on' || issues.length))
    redirect(target + '?notice=review-required');
  const stockConfirmed = form.get('stockConfirmed') === 'on';
  const quantity = text(form, 'quantity');
  if (stockConfirmed && (!/^\d+$/.test(quantity) || Number(quantity) > 1000000))
    redirect(target + '?notice=invalid-stock');
  await prisma.product.update({
    where: { id: product.id },
    data: {
      title: basic.data.title,
      priceCents: basic.data.priceCents,
      description: text(form, 'description') || null,
      categoryPath: basic.data.categoryPath || null,
      detailsJson: JSON.stringify(details.data),
      imagesJson: JSON.stringify(images.data),
      imagesVerifiedAt: imageDate,
      active: wantsActive,
      catalogReviewedAt: wantsActive ? new Date() : null,
      supplierManaged: form.get('supplierManaged') === 'on',
      stockManaged: form.get('stockManaged') === 'on',
      priceManaged: form.get('priceManaged') === 'on',
      ...(stockConfirmed
        ? {
            inventory: {
              upsert: {
                update: { quantity: Number(quantity), syncedAt: new Date() },
                create: { quantity: Number(quantity), syncedAt: new Date() },
              },
            },
          }
        : {}),
    },
  });
  revalidatePath(target);
  revalidatePath('/' + locale);
  revalidatePath('/' + locale + '/shop');
  revalidatePath('/' + locale + '/shop/' + product.slug);
  redirect(target + '?notice=saved');
}
export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { notice?: string };
}) {
  await requireAdmin();
  const locale = params.locale === 'en' ? 'en' : 'sl';
  const en = locale === 'en';
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { inventory: true, supplier: { select: { name: true } } },
  });
  const notices: Record<string, string> = {
    saved: en ? 'Product saved.' : 'Izdelek je shranjen.',
    invalid: en
      ? 'Check the product values and HTTPS links.'
      : 'Preveri podatke in povezave HTTPS.',
    'review-required': en
      ? 'To publish, select a category and confirm complete age, warning, Slovenian instruction, manufacturer, source and image information.'
      : 'Za objavo izberi kategorijo in potrdi popolne podatke o starosti, opozorilih, slovenskih navodilih, proizvajalcu, viru in slikah.',
    'invalid-stock': en
      ? 'Enter a confirmed whole-number stock quantity.'
      : 'Vnesi potrjeno celoštevilčno količino zaloge.',
    'not-found': en ? 'Product not found.' : 'Izdelka ni mogoče najti.',
  };
  return (
    <div className="catalog-admin">
      <h1 className="text-2xl font-semibold">
        {en ? 'Catalogue review' : 'Pregled kataloga'}
      </h1>
      <p className="admin-meta">
        {en
          ? 'Supplier imports remain drafts until product information and image usage are reviewed. Empty stock values are not a stock confirmation.'
          : 'Uvoženi izdelki ostanejo osnutki, dokler niso pregledani podatki in uporaba slik. Prazen podatek o zalogi ne pomeni potrjene količine.'}
      </p>
      {searchParams.notice && notices[searchParams.notice] && (
        <p role="status" className="admin-message">
          {notices[searchParams.notice]}
        </p>
      )}
      {products.map((product) => {
        const d = parseProductDetails(product.detailsJson);
        const fields = [
          [
            'manufacturerName',
            en ? 'Manufacturer' : 'Proizvajalec',
            d.manufacturer.name,
          ],
          [
            'manufacturerAddress',
            en ? 'Manufacturer address' : 'Naslov proizvajalca',
            d.manufacturer.address,
          ],
          [
            'manufacturerEmail',
            en ? 'Manufacturer email' : 'E-pošta proizvajalca',
            d.manufacturer.email,
          ],
          [
            'responsiblePersonName',
            en ? 'EU responsible person' : 'Odgovorna oseba v EU',
            d.euResponsiblePerson.name,
          ],
          [
            'responsiblePersonAddress',
            en
              ? 'EU responsible person address'
              : 'Naslov odgovorne osebe v EU',
            d.euResponsiblePerson.address,
          ],
          [
            'responsiblePersonEmail',
            en ? 'EU responsible person email' : 'E-pošta odgovorne osebe v EU',
            d.euResponsiblePerson.email,
          ],
          [
            'sourceUrl',
            en
              ? 'Supplier product source (HTTPS)'
              : 'Vir izdelka pri dobavitelju (HTTPS)',
            d.sourceUrl,
          ],
          [
            'imageRightsSource',
            en
              ? 'Image rights evidence/source'
              : 'Dokazilo ali vir pravice uporabe slik',
            d.imageRightsSource,
          ],
        ];
        return (
          <article key={product.id}>
            <h2>{product.title}</h2>
            <p className="admin-meta">
              ID: {product.id} · {en ? 'Supplier' : 'Dobavitelj'}:{' '}
              {product.supplier?.name || '—'}
              <br />
              {en ? 'Original category' : 'Izvirna kategorija'}:{' '}
              {product.supplierCategoryPath || '—'}
              <br />
              {en ? 'Stock last confirmed' : 'Zaloga nazadnje potrjena'}:{' '}
              {product.inventory?.syncedAt?.toLocaleString('sl-SI', {
                timeZone: 'Europe/Ljubljana',
              }) || '—'}
            </p>
            <form action={saveProduct}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="locale" value={locale} />
              <div className="admin-grid">
                <label>
                  {en ? 'Product name' : 'Ime izdelka'}
                  <input
                    name="title"
                    defaultValue={product.title}
                    required
                    maxLength={500}
                  />
                </label>
                <label>
                  {en
                    ? 'Selling price in cents (EUR)'
                    : 'Prodajna cena v centih (EUR)'}
                  <input
                    name="priceCents"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={product.priceCents}
                    required
                  />
                </label>
                <label>
                  {en ? 'Store category' : 'Kategorija trgovine'}
                  <select
                    name="categoryPath"
                    defaultValue={product.categoryPath || ''}
                  >
                    <option value="">{en ? 'Unmapped' : 'Nepreslikano'}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {en ? c.en : c.sl}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {en
                    ? 'Age label from supplier'
                    : 'Starostna oznaka dobavitelja'}
                  <input name="ageLabel" defaultValue={d.ageLabel} />
                </label>
                <label>
                  {en ? 'Minimum age in months' : 'Najnižja starost v mesecih'}
                  <input
                    name="minAgeMonths"
                    type="number"
                    min="0"
                    max="216"
                    defaultValue={d.minAgeMonths ?? ''}
                  />
                </label>
                <label>
                  {en
                    ? 'Maximum age in months (optional)'
                    : 'Najvišja starost v mesecih (neobvezno)'}
                  <input
                    name="maxAgeMonths"
                    type="number"
                    min="0"
                    max="216"
                    defaultValue={d.maxAgeMonths ?? ''}
                  />
                </label>
                <label className="wide">
                  {en ? 'Description' : 'Opis'}
                  <textarea
                    name="description"
                    defaultValue={product.description || ''}
                  />
                </label>
                <label className="wide">
                  {en
                    ? 'Supplier warnings and safety information'
                    : 'Dobaviteljeva opozorila in varnostni podatki'}
                  <textarea name="warnings" defaultValue={d.warnings} />
                </label>
                <label>
                  {en
                    ? 'Instructions URL (HTTPS)'
                    : 'Povezava do navodil (HTTPS)'}
                  <input
                    name="instructionsUrl"
                    type="url"
                    defaultValue={d.instructionsUrl}
                  />
                </label>
                <label>
                  {en ? 'Instructions language' : 'Jezik navodil'}
                  <select
                    name="instructionsLanguage"
                    defaultValue={d.instructionsLanguage}
                  >
                    <option value="">—</option>
                    <option value="sl">Slovenščina</option>
                    <option value="en">English</option>
                    <option value="other">{en ? 'Other' : 'Drugo'}</option>
                  </select>
                </label>
                {fields.map(([name, label, value]) => (
                  <label key={name}>
                    {label}
                    <input name={name} defaultValue={value} />
                  </label>
                ))}
                <label className="wide">
                  {en
                    ? 'Image URLs (one HTTPS link per line)'
                    : 'Povezave do slik (ena povezava HTTPS na vrstico)'}
                  <textarea
                    name="images"
                    defaultValue={safeParseJsonArray(product.imagesJson).join(
                      '\n',
                    )}
                  />
                </label>
                <label>
                  {en ? 'Confirmed stock quantity' : 'Potrjena količina zaloge'}
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    name="quantity"
                    defaultValue={product.inventory?.quantity ?? ''}
                  />
                </label>
              </div>
              <label className="admin-check">
                <input type="checkbox" name="stockConfirmed" />
                {en
                  ? 'I have just verified the entered stock quantity.'
                  : 'Pravkar sem preveril vneseno količino zaloge.'}
              </label>
              <label className="admin-check">
                <input type="checkbox" name="imagesConfirmed" />
                {en
                  ? 'I reviewed these images and their usage rights.'
                  : 'Preveril sem te slike in pravico do njihove uporabe.'}
              </label>
              <label className="admin-check">
                <input type="checkbox" name="contentConfirmed" />
                {en
                  ? 'I reviewed the product information against the supplier documentation.'
                  : 'Podatke izdelka sem preveril v dobaviteljevi dokumentaciji.'}
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  name="supplierManaged"
                  defaultChecked={product.supplierManaged}
                />
                {en
                  ? 'Update product content from supplier feed'
                  : 'Vsebino posodabljaj iz dobaviteljevega vira'}
              </label>
              <p className="admin-meta">
                {en
                  ? 'Supplier price / cost (cents)'
                  : 'Cena vira / nabavna cena (centi)'}
                : {product.supplierPriceCents ?? '—'} /{' '}
                {product.costPriceCents ?? '—'} ·{' '}
                {en ? 'Reserved quantity' : 'Rezervirana količina'}:{' '}
                {product.inventory?.allocatedQuantity ?? 0}
              </p>
              <label className="admin-check">
                <input
                  type="checkbox"
                  name="stockManaged"
                  defaultChecked={product.stockManaged}
                />
                {en
                  ? 'Refresh stock independently of content'
                  : 'Zalogo osvežuj neodvisno od vsebine'}
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  name="priceManaged"
                  defaultChecked={product.priceManaged}
                />
                {en
                  ? 'Allow feed to update the selling price'
                  : 'Dovoli viru posodabljanje prodajne cene'}
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={product.active}
                />
                {en ? 'Publish reviewed product' : 'Objavi pregledan izdelek'}
              </label>
              <button className="primary-btn">
                {en ? 'Save product' : 'Shrani izdelek'}
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
