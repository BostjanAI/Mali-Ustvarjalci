import { getMessages, type Locale } from '@/i18n';
import { renderLegalBody } from '@/lib/business';
import BusinessDetails from './BusinessDetails';
export default async function LegalPage({
  locale,
  section,
}: {
  locale: string;
  section: 'terms' | 'privacy' | 'returns' | 'cookies';
}) {
  const lang: Locale = locale === 'en' ? 'en' : 'sl';
  const messages = await getMessages(lang);
  const content = messages.legal[section];
  return (
    <article className="site-wrap legal-document">
      <h1 className="display-title">{content.title}</h1>
      <BusinessDetails locale={lang} />
      <div className="legal-copy">
        {renderLegalBody(content.body, lang)
          .split('\n\n')
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
    </article>
  );
}
