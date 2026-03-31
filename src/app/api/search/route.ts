import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10)));
  const sort = searchParams.get('sort') || 'newest'; // price_asc | price_desc | newest | popularity
  const brand = searchParams.get('brand') || undefined;
  const category = searchParams.get('category') || undefined;

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`search:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // MOCK MODE: Return mock data if enabled
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    let filteredProducts = [...MOCK_PRODUCTS];

    // Apply search filter
    if (q) {
      const lowerQ = q.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQ) ||
          (p.description && p.description.toLowerCase().includes(lowerQ))
      );
    }

    // Apply sorting
    if (sort === 'price_asc') {
      filteredProducts.sort((a, b) => a.priceCents - b.priceCents);
    } else if (sort === 'price_desc') {
      filteredProducts.sort((a, b) => b.priceCents - a.priceCents);
    }

    // Apply pagination
    const skip = (page - 1) * pageSize;
    const paginatedItems = filteredProducts.slice(skip, skip + pageSize);
    const total = filteredProducts.length;

    return NextResponse.json({
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  const where: any = { active: true };
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  if (brand) where.brand = brand;
  if (category) where.categoryPath = { contains: category };

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { priceCents: 'asc' };
  else if (sort === 'price_desc') orderBy = { priceCents: 'desc' };

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: { id: true, slug: true, title: true, priceCents: true, imagesJson: true },
    }).then((rows) => rows.map((r) => ({ ...r, images: r.imagesJson ? (JSON.parse(r.imagesJson) as string[]) : [] }))),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}


