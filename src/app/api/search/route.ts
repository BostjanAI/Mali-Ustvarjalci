import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { MOCK_PRODUCTS, localizeMockProduct } from '@/lib/mockProducts';
import { positiveInt, priceLimit } from '@/lib/catalog';
import {
  catalogProduct,
  publishedProducts,
  catalogSelect,
} from '@/lib/catalogProduct';
import type { Prisma } from '@prisma/client';
export async function GET(request: Request) {
  const { searchParams: sp } = new URL(request.url);
  const q = (sp.get('q') || '').trim().slice(0, 200);
  const page = positiveInt(sp.get('page'), 1);
  const pageSize = positiveInt(sp.get('pageSize'), 12, 48);
  const sort = sp.get('sort') || 'newest';
  const category = (sp.get('category') || '').slice(0, 100);
  const brand = (sp.get('brand') || '').slice(0, 100);
  const locale = sp.get('locale') === 'en' ? 'en' : 'sl';
  const min = priceLimit(sp.get('minPrice'));
  const max = priceLimit(sp.get('maxPrice'));
  if (min !== undefined && max !== undefined && min > max)
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 });
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!rateLimit('search:' + ip, 90, 60_000))
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  const response = (items: unknown[], total: number) =>
    NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      demo: process.env.NEXT_PUBLIC_MOCK_MODE === 'true',
    });
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    let items = MOCK_PRODUCTS.filter(
      (p) =>
        (!category || p.categoryPath === category) &&
        !brand &&
        (min === undefined || p.priceCents >= min) &&
        (max === undefined || p.priceCents <= max) &&
        (!q ||
          normalize(
            [p.title, p.titleEn, p.description, p.descriptionEn].join(' '),
          ).includes(normalize(q))),
    ).map((p) => localizeMockProduct(p, locale));
    if (sort === 'price_asc') items.sort((a, b) => a.priceCents - b.priceCents);
    if (sort === 'price_desc')
      items.sort((a, b) => b.priceCents - a.priceCents);
    return response(
      items.slice((page - 1) * pageSize, page * pageSize),
      items.length,
    );
  }
  const where: Prisma.ProductWhereInput = { ...publishedProducts };
  if (q)
    where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  if (category) where.categoryPath = category;
  if (brand) where.brand = brand;
  if (min !== undefined || max !== undefined)
    where.priceCents = { gte: min, lte: max };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc'
      ? { priceCents: 'asc' }
      : sort === 'price_desc'
        ? { priceCents: 'desc' }
        : { createdAt: 'desc' };
  try {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: catalogSelect,
      }),
      prisma.product.count({ where }),
    ]);
    return response(
      rows.map((row) => catalogProduct(row, locale)),
      total,
    );
  } catch {
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 503 });
  }
}
