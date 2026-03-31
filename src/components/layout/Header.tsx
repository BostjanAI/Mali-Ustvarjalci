'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/cartStore';

interface HeaderProps {
  locale: string;
}

export default function Header({ locale }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations();
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const segments = pathname?.split('/') || [];
    if (segments.length > 1) segments[1] = newLocale;
    return segments.join('/') || `/${newLocale}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex-shrink-0 font-bold text-xl text-brand tracking-tight no-underline hover:text-brand-600 transition-colors"
          >
            Mali Ustvarjalci
          </Link>

          {/* Search — desktop */}
          <form action={`/${locale}/shop`} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="search"
                name="q"
                placeholder={t('header.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Language switcher */}
            <div className="hidden sm:flex items-center text-sm font-medium">
              <Link
                href={switchLocale('sl')}
                className={[
                  'px-2 py-1 rounded no-underline transition-colors',
                  locale === 'sl'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:text-gray-900',
                ].join(' ')}
              >
                SL
              </Link>
              <span className="text-gray-200 select-none mx-0.5">|</span>
              <Link
                href={switchLocale('en')}
                className={[
                  'px-2 py-1 rounded no-underline transition-colors',
                  locale === 'en'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:text-gray-900',
                ].join(' ')}
              >
                EN
              </Link>
            </div>

            {/* Account */}
            <Link
              href={`/${locale}/admin`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-brand no-underline transition-colors rounded-lg hover:bg-gray-50"
            >
              <User className="w-4 h-4" />
              <span className="hidden lg:inline">{t('header.account')}</span>
            </Link>

            {/* Cart */}
            <Link
              href={`/${locale}/cart`}
              className="relative flex items-center p-2 text-gray-600 hover:text-brand no-underline transition-colors rounded-lg hover:bg-gray-50"
              aria-label={t('nav.cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-brand text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-brand rounded-lg hover:bg-gray-50 transition-colors"
              aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <form action={`/${locale}/shop`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="search"
                name="q"
                placeholder={t('header.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <nav
          className="md:hidden border-t border-gray-100 bg-white"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-3 space-y-0.5">
            <Link
              href={`/${locale}/shop`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand no-underline transition-colors"
            >
              {t('nav.shop')}
            </Link>
            <Link
              href={`/${locale}/cart`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand no-underline transition-colors"
            >
              <span>{t('nav.cart')}</span>
              {cartCount > 0 && (
                <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href={`/${locale}/admin`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand no-underline transition-colors"
            >
              {t('header.account')}
            </Link>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-widest mr-1">Lang</span>
            <Link
              href={switchLocale('sl')}
              className={[
                'text-sm font-medium px-2.5 py-1 rounded no-underline transition-colors',
                locale === 'sl' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100',
              ].join(' ')}
            >
              SL
            </Link>
            <Link
              href={switchLocale('en')}
              className={[
                'text-sm font-medium px-2.5 py-1 rounded no-underline transition-colors',
                locale === 'en' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100',
              ].join(' ')}
            >
              EN
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
