import LegalPage from '@/components/legal/LegalPage';
export default function ReturnsPage({
  params,
}: {
  params: { locale: string };
}) {
  return <LegalPage locale={params.locale} section="returns" />;
}
