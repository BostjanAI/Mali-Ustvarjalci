import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS, localizeMockProduct } from '@/lib/mockProducts';
import { safeParseJsonArray } from '@/lib/utils';
import type { CatalogProduct } from '@/lib/catalog';
export async function getProduct(slug: string, locale: string): Promise<CatalogProduct | null> {
 if(process.env.NEXT_PUBLIC_MOCK_MODE === 'true'){const product=MOCK_PRODUCTS.find(p=>p.slug===slug);return product?localizeMockProduct(product,locale):null;}
 const product=await prisma.product.findFirst({where:{slug,active:true}});
 if(!product) return null;
 return {id:product.id,slug:product.slug,title:product.title,description:product.description,priceCents:product.priceCents,images:safeParseJsonArray(product.imagesJson),categoryPath:product.categoryPath,brand:product.brand};
}
