import { getTranslations } from 'next-intl/server';
import { Star, Truck, Leaf, HeartHandshake } from 'lucide-react';

const BRAND_ICONS = [Star, Truck, Leaf, HeartHandshake];

type BrandKey = 'quality' | 'shipping' | 'eco' | 'support';
const BRAND_KEYS: BrandKey[] = ['quality', 'shipping', 'eco', 'support'];

const ICON_STYLES = [
  'bg-brand-100 text-brand-600',
  'bg-emerald-100 text-emerald-600',
  'bg-green-100 text-green-600',
  'bg-rose-100 text-rose-600',
];

export default async function BrandSection() {
  const t = await getTranslations('home.brand');

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('title')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {BRAND_KEYS.map((key, idx) => {
          const Icon = BRAND_ICONS[idx];
          return (
            <div key={key} className="flex flex-col items-center text-center gap-4">
              <div className={['w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0', ICON_STYLES[idx]].join(' ')}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t(`${key}.desc`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
