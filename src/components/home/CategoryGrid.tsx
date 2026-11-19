import Link from 'next/link';
import { Blocks, Palette, Brain, Sun, Puzzle, Scissors } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalog';
const icons=[Blocks,Palette,Brain,Sun,Puzzle,Scissors];
const captions=['Zgradi svoj svet','Pusti barvam prosto pot','Za radovedne glave','Dogodivščine zunaj','Košček za koščkom','Od ideje do izdelka'];
const captionsEn=['Build your world','Let colours run free','For curious minds','Adventures outside','Piece by piece','From idea to creation'];
export default function CategoryGrid({locale}:{locale:string}){const en=locale==='en';return <section id="categories" className="categories-section"><div className="site-wrap"><div className="section-head"><div><div className="eyebrow">{en?'Their interests. Their world.':'Njihova zanimanja. Njihov svet.'}</div><h2 className="section-title">{en?'Where shall we start?':'Kje začnemo danes?'}</h2></div><Link className="text-link" href={'/'+locale+'/shop'}>{en?'Explore everything':'Razišči vse'}</Link></div><div className="category-grid">{CATEGORIES.map((c,i)=>{const Icon=icons[i];return <Link key={c.id} href={'/'+locale+'/shop?category='+c.id} className={'category-tile tone-'+i}><span className="category-symbol"><Icon aria-hidden="true"/></span><h3>{en?c.en:c.sl}</h3><span className="category-caption">{en?captionsEn[i]:captions[i]}</span></Link>})}</div></div></section>}
