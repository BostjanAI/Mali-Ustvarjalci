import type { Metadata } from 'next';

const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const canonicalUrl = `${siteUrl}/${params.locale}/shop`;
  
  return {
    title: params.locale === 'en' ? 'Discover the collection' : 'Svet malih odkritij',
    description: params.locale === 'en' ? 'Creative toys and materials for curious little minds.' : 'Igrače in ustvarjalni pripomočki za radovedne male ustvarjalce.',
    openGraph: {
      title: 'Shop | Mali Ustvarjalci',
      description: params.locale === 'en' ? 'Creative toys and materials for curious little minds.' : 'Igrače in ustvarjalni pripomočki za radovedne male ustvarjalce.',
      type: 'website',
      url: canonicalUrl,
      locale: params.locale === 'en' ? 'en_US' : 'sl_SI',
      siteName: 'Mali Ustvarjalci',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shop | Mali Ustvarjalci',
      description: params.locale === 'en' ? 'Creative toys and materials for curious little minds.' : 'Igrače in ustvarjalni pripomočki za radovedne male ustvarjalce.',
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
