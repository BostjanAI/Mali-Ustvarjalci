import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS, localizeMockProduct } from '@/lib/mockProducts';
import {
  catalogProduct,
  publishedProducts,
  catalogSelect,
} from './catalogProduct';
import type { CatalogProduct } from './catalog';
export async function getProduct(
  slug: string,
  locale: string,
): Promise<CatalogProduct | null> {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const product = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return product ? localizeMockProduct(product, locale) : null;
  }
  const product = await prisma.product.findFirst({
    where: { slug, ...publishedProducts },
    select: catalogSelect,
  });
  return product ? catalogProduct(product, locale) : null;
}
