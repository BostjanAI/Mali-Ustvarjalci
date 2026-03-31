import { getTranslations } from 'next-intl/server';

export default async function TermsPage() {
  const t = await getTranslations('legal');
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t('terms.title')}</h1>
      <p className="whitespace-pre-line text-muted-foreground">{t('terms.body')}</p>
    </main>
  );
}


