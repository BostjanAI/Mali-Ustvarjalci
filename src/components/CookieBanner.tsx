"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getConsent, setConsent } from '@/lib/cookies';

export default function CookieBanner() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'sl';
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const c = getConsent();
    setVisible(!c);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur border-t shadow p-4">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p>
          {t('cookies.message')}{' '}
          <a href={`/${locale}/legal/cookies`} className="underline">{t('cookies.link')}</a>.
        </p>
        <div className="flex gap-2">
          <button
            className="border px-3 py-1 rounded"
            onClick={() => {
              setConsent('rejected');
              setVisible(false);
            }}
          >
            {t('cookies.reject')}
          </button>
          <button
            className="bg-black text-white px-3 py-1 rounded"
            onClick={() => {
              setConsent('accepted');
              setVisible(false);
            }}
          >
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}


