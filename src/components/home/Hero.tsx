import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroProps {
  locale: string;
}

export default async function Hero({ locale }: HeroProps) {
  const t = await getTranslations('home.hero');

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-200 opacity-30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-brand-300 opacity-20 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mali Ustvarjalci</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            {t('headline')}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">
            {t('subheadline')}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-7 py-3.5 rounded-full hover:bg-brand-600 active:bg-brand-700 transition-all shadow-sm hover:shadow-md no-underline text-base"
            >
              {t('cta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`#categories`}
              className="inline-flex items-center gap-2 bg-white text-brand border-2 border-brand font-semibold px-7 py-3.5 rounded-full hover:bg-brand-50 transition-all no-underline text-base"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
