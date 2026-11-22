import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalog';
import { business } from '@/lib/business';
export default function Footer({ locale }: { locale: string }) {
  const en = locale === 'en';
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">mali ustvarjalci</div>
            <p style={{ maxWidth: 290 }}>
              {en
                ? 'A little world of big ideas. Inspiration for play, creativity and moments together.'
                : 'Mali svet velikih idej. Navdih za igro, ustvarjanje in trenutke, ki jih preživimo skupaj.'}
            </p>
          </div>
          <div>
            <h3>{en ? 'Explore' : 'Razišči'}</h3>
            <ul>
              {CATEGORIES.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link href={'/' + locale + '/shop?category=' + c.id}>
                    {en ? c.en : c.sl}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={'/' + locale + '#gift-finder'}>
                  {en ? 'Gift ideas' : 'Ideje za darila'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>{en ? 'Shopping' : 'Nakupovanje'}</h3>
            <ul>
              {[
                ['terms', en ? 'Purchase terms' : 'Pogoji nakupa'],
                ['returns', en ? 'Returns' : 'Vračila in reklamacije'],
                ['privacy', en ? 'Privacy' : 'Zasebnost'],
                ['cookies', en ? 'Cookies' : 'Piškotki'],
              ].map(([slug, label]) => (
                <li key={slug}>
                  <Link href={'/' + locale + '/legal/' + slug}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{en ? 'Say hello' : 'Piši nam'}</h3>
            {business.legalName && (
              <p>
                <strong>{business.legalName}</strong>
              </p>
            )}
            {business.registeredAddress && <p>{business.registeredAddress}</p>}
            {business.email ? (
              <a href={'mailto:' + business.email}>{business.email}</a>
            ) : (
              <p>
                {en
                  ? 'Verified contact details are being completed.'
                  : 'Preverjeni kontaktni podatki se še dopolnjujejo.'}
              </p>
            )}
            {business.phone && (
              <p>
                <a href={'tel:' + business.phone.replaceAll(' ', '')}>
                  {business.phone}
                </a>
              </p>
            )}
            <p style={{ marginTop: 10 }}>
              {en
                ? 'Need help choosing? Tell us what sparks their curiosity.'
                : 'Potrebuješ pomoč pri izbiri? Povej nam, kaj jih navdušuje.'}
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Mali Ustvarjalci.{' '}
            {en ? 'All rights reserved.' : 'Vse pravice pridržane.'}
          </span>
          <span>
            {en
              ? 'Made for little discoveries.'
              : 'Za mala vsakodnevna odkritja.'}
          </span>
        </div>
      </div>
    </footer>
  );
}
