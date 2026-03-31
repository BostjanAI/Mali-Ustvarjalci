import { getTranslations } from 'next-intl/server';

export default async function ThankYouPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t('thankYou.title')}</h1>
      <p>{t('thankYou.message')}</p>
    </main>
  );
}





