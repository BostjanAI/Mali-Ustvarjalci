import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getMessages, Locale } from '@/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import dynamic from 'next/dynamic';

const CookieBanner = dynamic(() => import('@/components/CookieBanner'), { ssr: false });

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(params.locale);
  const messages = await getMessages(params.locale);

  return (
    <NextIntlClientProvider messages={messages} locale={params.locale}>
      <div className="flex flex-col min-h-screen">
        <Header locale={params.locale} />
        <main className="flex-1">
          {children}
        </main>
        <Footer locale={params.locale} />
      </div>
      <CookieBanner />
    </NextIntlClientProvider>
  );
}
