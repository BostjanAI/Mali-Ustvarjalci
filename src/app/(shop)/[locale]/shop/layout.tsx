import type { Metadata } from 'next';

const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const canonicalUrl = `${siteUrl}/${params.locale}/shop`;
  
  return {
    title: 'Shop',
    description: 'Browse our collection of creative products for children',
    openGraph: {
      title: 'Shop | Mali Ustvarjalci',
      description: 'Browse our collection of creative products for children',
      type: 'website',
      url: canonicalUrl,
      locale: params.locale === 'en' ? 'en_US' : 'sl_SI',
      siteName: 'Mali Ustvarjalci',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shop | Mali Ustvarjalci',
      description: 'Browse our collection of creative products for children',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'sl': `${siteUrl}/sl/shop`,
        'en': `${siteUrl}/en/shop`,
      },
    },
  };
}

export default function ShopPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
