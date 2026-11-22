import LegalPage from '@/components/legal/LegalPage';
export default function TermsPage({ params }: { params: { locale: string } }) {
  return <LegalPage locale={params.locale} section="terms" />;
}
