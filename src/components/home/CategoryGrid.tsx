import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Box, Palette, Brain, Sun, BookOpen, Scissors } from 'lucide-react';

interface CategoryGridProps {
  locale: string;
}

const CATEGORY_CONFIG = [
  {
    key: 'wooden' as const,
    icon: Box,
    href: 'wooden-toys',
    color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    iconColor: 'text-amber-500',
  },
  {
    key: 'art' as const,
    icon: Palette,
    href: 'art-craft',
    color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
    iconColor: 'text-pink-500',
  },
  {
    key: 'games' as const,
    icon: Brain,
    href: 'educational-games',
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    iconColor: 'text-violet-500',
  },
  {
    key: 'outdoor' as const,
    icon: Sun,
    href: 'outdoor-play',
    color: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    iconColor: 'text-green-500',
  },
  {
    key: 'books' as const,
    icon: BookOpen,
    href: 'books-puzzles',
    color: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
    iconColor: 'text-sky-500',
  },
  {
    key: 'diy' as const,
    icon: Scissors,
    href: 'diy-kits',
    color: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    iconColor: 'text-orange-500',
  },
] as const;

export default async function CategoryGrid({ locale }: CategoryGridProps) {
  const t = await getTranslations('home.categories');

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('title')}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORY_CONFIG.map(({ key, icon: Icon, href, color, iconColor }) => (
          <Link
            key={key}
            href={`/${locale}/shop?category=${href}`}
            className={[
              'group flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 bg-white',
              'transition-all duration-200 hover:shadow-md hover:-translate-y-1 no-underline',
            ].join(' ')}
          >
            <div className={['w-12 h-12 rounded-xl flex items-center justify-center transition-colors', color].join(' ')}>
              <Icon className={['w-6 h-6 transition-colors', iconColor].join(' ')} />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-brand transition-colors text-center leading-tight">
              {t(key)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
