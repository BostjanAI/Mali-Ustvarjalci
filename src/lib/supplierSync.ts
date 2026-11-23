import { supplierFeedToken } from './security';
import { prisma } from '@/lib/prisma';
import { createHash } from 'node:crypto';
import { parseProductDetails } from './productDetails';
import importSettings from '../../config/supplier-import.json';
import { fetchFeed, type FeedItem } from './supplierFeed';
export { fetchFeed } from './supplierFeed';
export type { FeedItem } from './supplierFeed';
export type SyncResult = {
  added: number;
  updated: number;
  deactivated: number;
  errors: number;
  skipped: number;
  unmappedCategories: string[];
};
const blank = (): SyncResult => ({
  added: 0,
  updated: 0,
  deactivated: 0,
  errors: 0,
  skipped: 0,
  unmappedCategories: [],
});
export function supplierSlug(title: string, supplierId: string, id: string) {
  const titlePart =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'product';
  return (
    titlePart +
    '-' +
    createHash('sha256')
      .update(supplierId + ':' + id)
      .digest('hex')
      .slice(0, 16)
  );
}
export async function applySupplierItems(
  supplierId: string,
  items: FeedItem[],
  options: { deactivateMissing?: boolean } = {},
): Promise<SyncResult> {
  if (!items.length || new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error('A complete valid feed is required');
  const result = blank();
  result.unmappedCategories = Array.from(
    new Set(
      items.filter((i) => !i.category).map((i) => i.rawCategory || '(missing)'),
    ),
  );
  await prisma.$transaction(
    async (tx) => {
      for (const item of items) {
        const existing = await tx.product.findUnique({
          where: {
            supplierId_supplierProductId: {
              supplierId,
              supplierProductId: item.id,
            },
          },
        });
        const contentManaged = !existing || existing.supplierManaged;
        const now = new Date();
        const imagesJson = JSON.stringify(item.images);
        const detailsJson = JSON.stringify(item.details);
        const imagesChanged =
          !!existing &&
          (existing.imagesJson !== imagesJson ||
            parseProductDetails(existing.detailsJson).imageRightsSource !==
              item.details.imageRightsSource);
        const contentChanged =
          !!existing &&
          (existing.title !== item.title ||
            existing.description !== (item.description || null) ||
            existing.categoryPath !== item.category ||
            existing.detailsJson !== detailsJson ||
            existing.brand !== (item.brand || null));
        const needsReview =
          contentManaged &&
          (!existing || imagesChanged || contentChanged || !item.category);
        const inventory =
          item.quantity === undefined || existing?.stockManaged === false
            ? undefined
            : {
                upsert: {
                  update: {
                    quantity: item.quantity,
                    lastSupplierQty: item.quantity,
                    syncedAt: now,
                  },
                  create: {
                    quantity: item.quantity,
                    lastSupplierQty: item.quantity,
                    syncedAt: now,
                  },
                },
              };
        const data = {
          lastSyncedAt: now,
          supplierPriceCents: Math.round(item.price * 100),
          ...(item.costPrice !== undefined
            ? { costPriceCents: Math.round(item.costPrice * 100) }
            : {}),
          ...(!existing || existing.priceManaged
            ? {
                priceCents: Math.round(item.price * 100),
                currency: item.currency,
              }
            : {}),
          ...(contentManaged
            ? {
                title: item.title,
                description: item.description || null,
                brand: item.brand || null,
                categoryPath: item.category,
                supplierCategoryPath: item.rawCategory || null,
                detailsJson,
                imagesJson,
                ...(needsReview
                  ? { active: false, catalogReviewedAt: null }
                  : {}),
                ...(imagesChanged ? { imagesVerifiedAt: null } : {}),
              }
            : {}),
          ...(inventory ? { inventory } : {}),
        };
        if (existing) {
          await tx.product.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          const quantity = item.quantity ?? 0;
          await tx.product.create({
            data: {
              ...data,
              title: item.title,
              priceCents: Math.round(item.price * 100),
              currency: item.currency,
              active: false,
              supplierId,
              supplierProductId: item.id,
              supplierManaged: true,
              slug: supplierSlug(item.title, supplierId, item.id),
              variants: {
                create: [
                  {
                    name: 'Default',
                    sku: supplierId + ':' + item.id,
                    priceCents: Math.round(item.price * 100),
                  },
                ],
              },
              inventory: {
                create: {
                  quantity,
                  lastSupplierQty: item.quantity ?? null,
                  syncedAt: item.quantity === undefined ? null : now,
                },
              },
            },
          });
          result.added++;
        }
      }
      if (options.deactivateMissing) {
        const changed = await tx.product.updateMany({
          where: {
            supplierId,
            supplierManaged: true,
            active: true,
            supplierProductId: { notIn: items.map((i) => i.id) },
          },
          data: { active: false },
        });
        result.deactivated = changed.count;
      }
      await tx.supplier.update({
        where: { id: supplierId },
        data: { lastSyncedAt: new Date() },
      });
      await tx.syncLog.create({
        data: {
          supplierId,
          type: 'sync',
          added: result.added,
          updated: result.updated,
          deactivated: result.deactivated,
          errors: 0,
          message: JSON.stringify({
            unmappedCategories: result.unmappedCategories,
            skipped: result.skipped,
          }),
        },
      });
    },
    { timeout: 120000 },
  );
  return result;
}
export function isSupplierSyncDue(last: Date | null, frequency: string | null) {
  return (
    !last ||
    !['@15min', '@daily', '@hourly'].includes(frequency || '') ||
    Date.now() - last.getTime() >=
      (frequency === '@15min'
        ? 900000
        : frequency === '@hourly'
          ? 3600000
          : 86400000)
  );
}
export async function runSupplierSync() {
  let suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!suppliers.length) {
    const url = process.env.SUPPLIER_FEED_URL;
    const name = process.env.SUPPLIER_NAME;
    if (!url || !name)
      throw new Error('Configure a supplier name and feed first');
    const items = await fetchFeed(
      url,
      process.env.SUPPLIER_API_KEY,
      'environment-supplier',
    );
    const supplier = await prisma.supplier.upsert({
      where: { id: 'environment-supplier' },
      create: {
        id: 'environment-supplier',
        name,
        feedUrl: url,
        syncFrequency: '@15min',
      },
      update: { name, feedUrl: url },
    });
    return applySupplierItems(supplier.id, items, {
      deactivateMissing: importSettings.deactivateMissing,
    });
  }
  const total = blank();
  for (const supplier of suppliers) {
    if (
      !supplier.feedUrl ||
      !isSupplierSyncDue(supplier.lastSyncedAt, supplier.syncFrequency)
    ) {
      total.skipped++;
      continue;
    }
    try {
      const items = await fetchFeed(
        supplier.feedUrl,
        supplierFeedToken(supplier.feedUrl, supplier.authToken),
        supplier.id,
      );
      const supplierOptions = (
        importSettings.suppliers as Record<
          string,
          { deactivateMissing?: boolean }
        >
      )[supplier.id];
      const result = await applySupplierItems(supplier.id, items, {
        deactivateMissing:
          supplierOptions?.deactivateMissing ??
          importSettings.deactivateMissing,
      });
      for (const key of [
        'added',
        'updated',
        'deactivated',
        'errors',
        'skipped',
      ] as const)
        total[key] += result[key];
      total.unmappedCategories.push(...result.unmappedCategories);
    } catch {
      total.errors++;
      await prisma.syncLog.create({
        data: {
          supplierId: supplier.id,
          type: 'sync',
          errors: 1,
          message:
            'Feed download, validation or transaction failed; existing products were retained.',
        },
      });
    }
  }
  total.unmappedCategories = Array.from(new Set(total.unmappedCategories));
  return total;
}
