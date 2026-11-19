import type { Locale } from '@/i18n';
import { unstable_setRequestLocale } from 'next-intl/server';
import Hero from '@/components/home/Hero';
import CategoryGrid from '@/components/home/CategoryGrid';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import BrandSection from '@/components/home/BrandSection';
import GiftFinder from '@/components/home/GiftFinder';
import PlayTogether from '@/components/home/PlayTogether';
export default function HomePage({ params }: { params: { locale: string } }) {
 unstable_setRequestLocale(params.locale);
 return <><Hero locale={params.locale}/><CategoryGrid locale={params.locale}/><FeaturedProducts locale={params.locale}/><PlayTogether locale={params.locale}/><GiftFinder locale={params.locale}/><BrandSection locale={params.locale}/></>;
}
export function generateStaticParams(){return [{locale:'sl' as Locale},{locale:'en' as Locale}]}
