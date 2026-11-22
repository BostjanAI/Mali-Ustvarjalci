import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS, localizeMockProduct } from '@/lib/mockProducts';
import {
  catalogProduct,
  publishedProducts,
  catalogSelect,
} from './catalogProduct';
import type { CatalogProduct } from './catalog';
export type FeaturedProduct = CatalogProduct;
export async function getFeaturedProducts(
  limit = 4,
  locale = 'sl',
): Promise<FeaturedProduct[]> {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return MOCK_PRODUCTS.slice(0, limit).map((p) =>
      localizeMockProduct(p, locale),
    );
  const rows = await prisma.product.findMany({
    where: publishedProducts,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: catalogSelect,
  });
  return rows.map((row) => catalogProduct(row, locale));
}
