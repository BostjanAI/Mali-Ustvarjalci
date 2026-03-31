import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

export type FeaturedProduct = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  images: string[];
};

export async function getFeaturedProducts(limit = 4): Promise<FeaturedProduct[]> {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return MOCK_PRODUCTS.slice(0, limit).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? null,
      priceCents: p.priceCents,
      images: p.images ?? [],
    }));
  }

  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      imagesJson: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    priceCents: r.priceCents,
    images: r.imagesJson ? (JSON.parse(r.imagesJson) as string[]) : [],
  }));
}
