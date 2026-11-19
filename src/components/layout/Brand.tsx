import Link from 'next/link';
export default function Brand({ locale }: { locale: string }) {
 return <Link href={'/' + locale} className="brand" aria-label="Mali Ustvarjalci"><svg className="brand-mark" viewBox="0 0 50 46" fill="none" aria-hidden="true"><path d="M5 40V26a20 20 0 0 1 40 0v14" stroke="#bc6148" strokeWidth="7"/><path d="M15 40V26a10 10 0 0 1 20 0v14" stroke="#d9ad50" strokeWidth="6"/><path d="M25 27v13" stroke="#78937b" strokeWidth="6" strokeLinecap="round"/></svg><span className="brand-name">mali ustvarjalci<small>{locale === 'en' ? 'a little world of big ideas' : 'mali svet velikih idej'}</small></span></Link>;
}
