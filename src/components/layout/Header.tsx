'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShoppingBag, Menu, X, Search } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { CATEGORIES } from '@/lib/catalog';
import Brand from './Brand';
export default function Header({ locale }: { locale: string }) {
 const en = locale === 'en';
 const [menuOpen, setMenuOpen] = useState(false);
 const pathname = usePathname();
 const items = useCartStore(s => s.items);
 const cartCount = items.reduce((n,i) => n + i.quantity, 0);
 useEffect(() => { void useCartStore.persist.rehydrate(); }, []);
 useEffect(() => { setMenuOpen(false); }, [pathname]);
 useEffect(() => { if(!menuOpen) return; const close = (e: KeyboardEvent) => { if(e.key === 'Escape') setMenuOpen(false); }; window.addEventListener('keydown', close);return () => window.removeEventListener('keydown', close); }, [menuOpen]);
 const languages = <Suspense fallback={<LanguageLinks locale={locale} pathname={pathname||'/'+locale} query=""/>}><CurrentLanguageLinks locale={locale} pathname={pathname||'/'+locale}/></Suspense>;
 return <><a href="#main-content" className="skip-link">{en ? 'Skip to content' : 'Preskoči na vsebino'}</a><div className="announcement">{en ? 'For curious minds and creative little hands.' : 'Za radovedne glave in ustvarjalne roke.'}</div><header className="site-header"><div className="site-wrap"><div className="header-main"><Brand locale={locale}/><form action={'/' + locale + '/shop'} className="header-search" role="search"><label className="sr-only" htmlFor="site-search">{en ? 'Search products' : 'Išči izdelke'}</label><input id="site-search" type="search" name="q" placeholder={en ? 'What will we create today?' : 'Kaj bomo ustvarjali danes?'}/><button className="search-submit" aria-label={en ? 'Search' : 'Poišči'}><Search size={19}/></button></form><div className="header-actions">{languages}<Link href={'/' + locale + '/cart'} className="cart-link" aria-label={(en ? 'Cart, items: ' : 'Košarica, izdelkov: ') + cartCount}><ShoppingBag size={23}/><span className="cart-label">{en ? 'Cart' : 'Košarica'}</span><span className="cart-count">{cartCount}</span></Link><button className="menu-toggle" aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label={en ? (menuOpen ? 'Close menu' : 'Open menu') : (menuOpen ? 'Zapri meni' : 'Odpri meni')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div></div><nav className="nav-row" aria-label={en ? 'Main navigation' : 'Glavna navigacija'}><Link href={'/' + locale + '/shop'}>{en ? 'All products' : 'Vsi izdelki'}</Link>{CATEGORIES.filter(c => c.id !== 'outdoor-play').map(c => <Link key={c.id} href={'/' + locale + '/shop?category=' + c.id}>{en ? c.en : c.sl}</Link>)}<Link href={'/' + locale + '#gift-finder'}>{en ? 'Find a gift' : 'Poišči darilo'}</Link></nav></div>{menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label={en ? 'Mobile navigation' : 'Mobilna navigacija'}><Link href={'/' + locale + '/shop'} onClick={() => setMenuOpen(false)}>{en ? 'All products' : 'Vsi izdelki'}</Link>{CATEGORIES.map(c => <Link key={c.id} href={'/' + locale + '/shop?category=' + c.id} onClick={() => setMenuOpen(false)}>{en ? c.en : c.sl}</Link>)}<Link href={'/' + locale + '#gift-finder'} onClick={() => setMenuOpen(false)}>{en ? 'Find a gift' : 'Poišči darilo'}</Link>{languages}</nav>}</header></>;
}

function LanguageLinks({locale,pathname,query}:{locale:string;pathname:string;query:string}){const switchLocale=(lang:string)=>'/'+lang+pathname.replace(/^\/(sl|en)/,'')+(query?'?'+query:'');return <div className="lang-switch"><Link href={switchLocale('sl')} aria-current={locale==='sl'?'page':undefined} lang="sl">SL</Link><span aria-hidden="true">/</span><Link href={switchLocale('en')} aria-current={locale==='en'?'page':undefined} lang="en">EN</Link></div>}
function CurrentLanguageLinks({locale,pathname}:{locale:string;pathname:string}){const params=useSearchParams();return <LanguageLinks locale={locale} pathname={pathname} query={params?.toString()||''}/>}
