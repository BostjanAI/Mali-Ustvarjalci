import { parse } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { productDetailsSchema, type ProductDetails } from './productDetails';
import { mapSupplierCategory, type CategoryId } from './supplierCategories';
export type FeedItem = {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: 'EUR';
  quantity?: number;
  images: string[];
  brand?: string;
  rawCategory: string;
  category: CategoryId | null;
  details: ProductDetails;
};
const https = z
  .string()
  .url()
  .refine((url) => new URL(url).protocol === 'https:', 'HTTPS is required');
const itemSchema = z.object({
  id: z.string().trim().min(1).max(150),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(30000).optional(),
  price: z.number().finite().positive().max(100000),
  currency: z.literal('EUR'),
  quantity: z.number().int().min(0).max(1000000).optional(),
  images: z.array(https).max(20),
  brand: z.string().max(250).optional(),
  rawCategory: z.string().max(2000),
  category: z.string().nullable(),
  details: productDetailsSchema,
});
function optionalText(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new Error('Expected text');
  return String(value).trim();
}
function optionalInt(value: unknown) {
  const text = optionalText(value);
  if (text === undefined) return undefined;
  if (!/^\d+$/.test(text)) throw new Error('Expected a non-negative integer');
  return Number(text);
}
function euro(value: unknown) {
  const text = optionalText(value);
  if (!text || !/^\d+(?:[.,]\d{1,2})?$/.test(text))
    throw new Error('Invalid EUR price');
  return Number(text.replace(',', '.'));
}
function imageList(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object' && value !== null) {
    const images = (value as Record<string, unknown>).image;
    return imageList(images);
  }
  const text = String(value).trim();
  return text.startsWith('[')
    ? imageList(JSON.parse(text))
    : text
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
}
export function normalizeFeedItem(
  raw: Record<string, unknown>,
  supplierKey = '',
): FeedItem {
  let detailsInput: Record<string, unknown> = {};
  if (raw.details && typeof raw.details === 'object')
    detailsInput = raw.details as Record<string, unknown>;
  else if (typeof raw.detailsJson === 'string' && raw.detailsJson.trim())
    detailsInput = JSON.parse(raw.detailsJson);
  const details = productDetailsSchema.parse({
    minAgeMonths: optionalInt(raw.minAgeMonths) ?? null,
    maxAgeMonths: optionalInt(raw.maxAgeMonths) ?? null,
    ageLabel: optionalText(raw.ageLabel),
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.join('\n')
      : optionalText(raw.warnings),
    instructionsUrl: optionalText(raw.instructionsUrl),
    instructionsLanguage: optionalText(raw.instructionsLanguage),
    manufacturer: {
      name: optionalText(raw.manufacturerName),
      address: optionalText(raw.manufacturerAddress),
      email: optionalText(raw.manufacturerEmail),
    },
    euResponsiblePerson: {
      name: optionalText(raw.responsiblePersonName),
      address: optionalText(raw.responsiblePersonAddress),
      email: optionalText(raw.responsiblePersonEmail),
    },
    sourceUrl: optionalText(raw.sourceUrl),
    imageRightsSource: optionalText(raw.imageRightsSource),
    ...detailsInput,
  });
  const rawCategory = optionalText(raw.categoryPath ?? raw.category) || '';
  const item = itemSchema.parse({
    id: optionalText(raw.id ?? raw.sku),
    title: optionalText(raw.title),
    description: optionalText(raw.description),
    price: euro(raw.price),
    currency: optionalText(raw.currency) || 'EUR',
    quantity: optionalInt(raw.quantity),
    images: imageList(raw.images),
    brand: optionalText(raw.brand),
    rawCategory,
    category: mapSupplierCategory(rawCategory, supplierKey),
    details,
  });
  return { ...item, category: item.category as CategoryId | null };
}
export function parseSupplierFeed(
  text: string,
  format: string,
  supplierKey = '',
): FeedItem[] {
  let rows: unknown;
  if (
    format.includes('json') ||
    text.trimStart().startsWith('[') ||
    text.trimStart().startsWith('{')
  ) {
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : data.items;
  } else if (format.includes('xml') || text.trimStart().startsWith('<')) {
    const xml = new XMLParser({
      ignoreAttributes: false,
      processEntities: false,
      parseTagValue: false,
    }).parse(text);
    rows = xml.items?.item ?? xml.rss?.channel?.item ?? [];
    if (!Array.isArray(rows)) rows = [rows];
  } else {
    rows = parse(text, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      delimiter:
        format.includes('semicolon') ||
        (text.split(/\r?\n/, 1)[0].includes(';') &&
          !text.split(/\r?\n/, 1)[0].includes(','))
          ? ';'
          : ',',
    });
  }
  if (!Array.isArray(rows) || !rows.length)
    throw new Error('The feed is empty or has no items');
  if (rows.length > 20000) throw new Error('The feed exceeds 20000 products');
  const seen = new Set<string>();
  return rows.map((row, index) => {
    try {
      if (!row || typeof row !== 'object')
        throw new Error('Expected an object');
      const item = normalizeFeedItem(
        row as Record<string, unknown>,
        supplierKey,
      );
      if (seen.has(item.id)) throw new Error('Duplicate supplier product ID');
      seen.add(item.id);
      return item;
    } catch {
      throw new Error('Invalid supplier product at row ' + (index + 1));
    }
  });
}
export async function fetchFeed(
  url: string,
  apiKey?: string,
  supplierKey = '',
): Promise<FeedItem[]> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    /(^|\.)example\.(com|org|net)$/i.test(parsed.hostname)
  )
    throw new Error('A real HTTPS supplier feed is required');
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: 'Bearer ' + apiKey } : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  });
  if (!response.ok || !response.body)
    throw new Error('Supplier feed download failed');
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024)
        throw new Error('Supplier feed exceeds 10 MB');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = Buffer.concat(chunks);
  const checksum = response.headers.get('x-feed-sha256');
  if (checksum) {
    const { createHash } = await import('node:crypto');
    if (createHash('sha256').update(bytes).digest('hex') !== checksum)
      throw new Error('Supplier feed checksum mismatch');
  }
  return parseSupplierFeed(
    bytes.toString('utf8'),
    response.headers.get('content-type') || '',
    supplierKey,
  );
}
