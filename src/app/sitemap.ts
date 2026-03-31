import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';
  const locales = ['sl', 'en'];
  
  const products = await prisma.product.findMany({ 
    where: { active: true }, 
    select: { slug: true, categoryPath: true, updatedAt: true } 
  });

  const sitemap: MetadataRoute.Sitemap = [];

  sitemap.push({
    url: base,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  });

  for (const loc of locales) {
    sitemap.push({
      url: `${base}/${loc}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    });
    
    sitemap.push({
      url: `${base}/${loc}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    });
  }

  const categories = Array.from(new Set(products.map((p) => p.categoryPath).filter(Boolean) as string[]));
  for (const c of categories) {
    const enc = encodeURIComponent(c);
    for (const loc of locales) {
      sitemap.push({
        url: `${base}/${loc}/shop?category=${enc}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  for (const p of products) {
    for (const loc of locales) {
      sitemap.push({
        url: `${base}/${loc}/shop/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return sitemap;
}
