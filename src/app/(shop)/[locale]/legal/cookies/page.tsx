import LegalPage from '@/components/legal/LegalPage';
export default function CookiesPage({
  params,
}: {
  params: { locale: string };
}) {
  return <LegalPage locale={params.locale} section="cookies" />;
}
