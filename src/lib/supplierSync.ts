import { prisma } from '@/lib/prisma';
import { XMLParser } from 'fast-xml-parser';

export type FeedItem = {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  quantity?: number;
  images?: string[];
  brand?: string;
  categoryPath?: string;
};

export async function fetchFeed(url: string, apiKey?: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch supplier feed: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  const checksumHeader = res.headers.get('x-feed-sha256');
  const text = await res.text();
  if (checksumHeader && typeof window === 'undefined') {
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    if (hash !== checksumHeader) {
      throw new Error('Supplier feed checksum mismatch');
    }
  }
  if (contentType.includes('application/json')) {
    const data = JSON.parse(text);
    return (data.items || data) as FeedItem[];
  }
  if (contentType.includes('text/csv')) {
    const lines = text.trim().split('\n');
    const [header, ...rows] = lines;
    const cols = header.split(',');
    return rows.map((r) => {
      const vals = r.split(',');
      const obj: any = {};
      cols.forEach((c, i) => (obj[c] = vals[i]));
      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        price: parseFloat(obj.price),
        quantity: parseInt(obj.quantity ?? '0', 10),
      } as FeedItem;
    });
  }
  const parser = new XMLParser({ ignoreAttributes: false });
  const xml = parser.parse(text);
  const items = xml.items?.item || xml.rss?.channel?.item || [];
  return items.map((it: any) => ({
    id: it.id || it.guid || it.sku,
    title: it.title,
    description: it.description,
    price: parseFloat(it.price),
    quantity: parseInt(it.quantity ?? '0', 10),
  }));
}

function isDue(last: Date | null, frequency?: string | null): boolean {
  if (!frequency) return true;
  const now = Date.now();
  const lastMs = last ? last.getTime() : 0;
  // Very simple presets
  if (frequency === '@hourly') return now - lastMs >= 60 * 60 * 1000;
  if (frequency === '@daily') return now - lastMs >= 24 * 60 * 60 * 1000;
  return true;
}

export async function runSupplierSync() {
  // Iterate all active suppliers; fallback to env single feed or demo
  const suppliers = await prisma.supplier.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
  const batches = suppliers.length ? suppliers : [{ id: 'env', name: 'ENV', feedUrl: process.env.SUPPLIER_FEED_URL, authToken: process.env.SUPPLIER_API_KEY, syncFrequency: '@daily', updatedAt: null } as any];
  const allItems: FeedItem[] = [];
  for (const s of batches) {
    if (!s.feedUrl) continue;
    if (!isDue((s as any).lastSyncedAt || (s as any).updatedAt || null, (s as any).syncFrequency)) continue;
    try {
      const items = await fetchFeed(s.feedUrl, s.authToken || process.env.SUPPLIER_API_KEY);
      allItems.push(...items);
      if ((s as any).id && (s as any).id !== 'env') {
        await prisma.supplier.update({ where: { id: (s as any).id }, data: { lastSyncedAt: new Date() } });
      }
    } catch (e) {
      // continue with others
    }
  }
  const items = allItems.length ? allItems : await fetchFeed('demo:10');

  let added = 0,
    updated = 0,
    deactivated = 0,
    errors = 0;

  const existing = await prisma.product.findMany({ select: { id: true, slug: true, supplierProductId: true } });
  const existingBySupplierId = new Map(existing.map((p) => [p.supplierProductId ?? '', p]));
  const seen = new Set<string>();

  for (const item of items) {
    try {
      seen.add(item.id);
      const found = existingBySupplierId.get(item.id);
      const priceCents = Math.round(item.price * 100);
      if (found) {
        await prisma.product.update({
          where: { id: found.id },
          data: {
            priceCents,
            description: item.description ?? undefined,
            lastSyncedAt: new Date(),
            inventory: { upsert: { update: { quantity: item.quantity ?? 0 }, create: { quantity: item.quantity ?? 0 } } },
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            title: item.title,
            slug: item.title.toLowerCase().replace(/\s+/g, '-') + '-' + item.id,
            description: item.description ?? null,
            priceCents,
            imagesJson: item.images ? JSON.stringify(item.images) : undefined,
            supplierManaged: true,
            supplierProductId: item.id,
            lastSyncedAt: new Date(),
            variants: { create: [{ name: 'Default', sku: item.id, priceCents }] },
            inventory: { create: { quantity: item.quantity ?? 0 } },
          },
        });
        added++;
      }
    } catch (e) {
      errors++;
    }
  }

  const toDeactivate = await prisma.product.findMany({
    where: { supplierManaged: true, supplierProductId: { notIn: Array.from(seen) } },
    select: { id: true },
  });
  if (toDeactivate.length) {
    await prisma.product.updateMany({ where: { id: { in: toDeactivate.map((p) => p.id) } }, data: { active: false } });
    deactivated += toDeactivate.length;
  }

  await prisma.syncLog.create({ data: { type: 'sync', added, updated, deactivated, errors, message: 'Supplier sync completed' } });
  return { added, updated, deactivated, errors };
}







