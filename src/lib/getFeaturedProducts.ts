import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS, localizeMockProduct } from '@/lib/mockProducts';
import { safeParseJsonArray } from '@/lib/utils';
import type { CatalogProduct } from '@/lib/catalog';
export type FeaturedProduct = CatalogProduct;
export async function getFeaturedProducts(limit = 4, locale = 'sl'): Promise<FeaturedProduct[]> {
 if(process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return MOCK_PRODUCTS.slice(0,limit).map(p=>localizeMockProduct(p,locale));
 const rows = await prisma.product.findMany({where:{active:true},orderBy:{createdAt:'desc'},take:limit,select:{id:true,slug:true,title:true,description:true,priceCents:true,imagesJson:true,categoryPath:true,brand:true}});
 return rows.map(({imagesJson,...p})=>({...p,images:safeParseJsonArray(imagesJson)}));
}
