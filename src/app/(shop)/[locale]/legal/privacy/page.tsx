import LegalPage from '@/components/legal/LegalPage';
export default function PrivacyPage({
  params,
}: {
  params: { locale: string };
}) {
  return <LegalPage locale={params.locale} section="privacy" />;
}
