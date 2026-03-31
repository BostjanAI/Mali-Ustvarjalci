import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
  const t = await getTranslations('legal');
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t('privacy.title')}</h1>
      <p className="whitespace-pre-line text-muted-foreground">{t('privacy.body')}</p>
    </main>
  );
}


