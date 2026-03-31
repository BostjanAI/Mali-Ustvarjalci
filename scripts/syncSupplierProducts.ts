import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

type FeedItem = {
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

async function fetchFeed(url: string, apiKey?: string): Promise<FeedItem[]> {
  // Demo generator for local testing
  if (url === 'demo' || url.startsWith('demo:')) {
    const count = Number(url.split(':')[1] ?? 10);
    return Array.from({ length: count }).map((_, i) => ({
      id: `DEMO-${i + 1}`,
      title: `Demo Supplier Product ${i + 1}`,
      description: 'Generated demo item',
      price: 19.99 + i,
      quantity: 5 + i,
      images: [],
    }));
  }

  // Local file support (expects JSON array or CSV with standard columns)
  if (url.startsWith('file:')) {
    const filePath = url.replace('file:', '');
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    const text = await fs.readFile(abs, 'utf8');
    if (abs.endsWith('.json')) {
      const data = JSON.parse(text);
      return (data.items || data) as FeedItem[];
    }
    if (abs.endsWith('.csv')) {
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
  }

  const res = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch supplier feed: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (contentType.includes('application/json')) {
    const data = JSON.parse(text);
    return (data.items || data) as FeedItem[];
  }
  if (contentType.includes('text/csv')) {
    // Minimal CSV support: id,title,description,price,quantity
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
  // XML
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

async function sync() {
  const feedUrl = process.env.SUPPLIER_FEED_URL || 'demo:10';

  const apiKey = process.env.SUPPLIER_API_KEY;
  const items = await fetchFeed(feedUrl, apiKey);

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
            imagesJson: JSON.stringify(item.images ?? []),
            supplierManaged: true,
            supplierProductId: item.id,
            lastSyncedAt: new Date(),
            variants: { create: [{ name: 'Default', sku: item.id, priceCents }] },
            inventory: { create: { quantity: item.quantity ?? 0 } },
          },
        });
        added++;
      }
      await delay(5); // be gentle
    } catch (e) {
      console.error('Sync item failed', item.id, e);
      errors++;
    }
  }

  // Deactivate products that were not seen in the feed
  const toDeactivate = await prisma.product.findMany({
    where: { supplierManaged: true, supplierProductId: { notIn: Array.from(seen) } },
    select: { id: true },
  });
  if (toDeactivate.length) {
    await prisma.product.updateMany({ where: { id: { in: toDeactivate.map((p) => p.id) } }, data: { active: false } });
    deactivated += toDeactivate.length;
  }

  await prisma.syncLog.create({
    data: { type: 'sync', added, updated, deactivated, errors, message: 'Supplier sync completed' },
  });

  console.log('Sync done', { added, updated, deactivated, errors });
}

sync()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });







