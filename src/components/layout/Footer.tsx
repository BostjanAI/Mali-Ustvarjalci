import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Mail, MapPin } from 'lucide-react';

interface FooterProps {
  locale: string;
}

export default async function Footer({ locale }: FooterProps) {
  const t = await getTranslations();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="text-white font-bold text-xl tracking-tight">Mali Ustvarjalci</span>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <a
                  href={`mailto:${t('footer.email')}`}
                  className="hover:text-brand-300 transition-colors no-underline"
                >
                  {t('footer.email')}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>Slovenia</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer.legal')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href={`/${locale}/legal/terms`}
                  className="text-gray-400 hover:text-brand-300 transition-colors no-underline"
                >
                  {t('legal.terms.title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/legal/privacy`}
                  className="text-gray-400 hover:text-brand-300 transition-colors no-underline"
                >
                  {t('legal.privacy.title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/legal/returns`}
                  className="text-gray-400 hover:text-brand-300 transition-colors no-underline"
                >
                  {t('legal.returns.title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/legal/cookies`}
                  className="text-gray-400 hover:text-brand-300 transition-colors no-underline"
                >
                  {t('legal.cookies.title')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 text-center text-sm text-gray-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
