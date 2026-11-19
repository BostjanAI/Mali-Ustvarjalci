'use client';
import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { X, ShoppingBag } from 'lucide-react';
import { CatalogProduct, categoryLabel } from '@/lib/catalog';
import { formatCurrencyCents } from '@/lib/i18n';
import ProductImage from './ProductImage';
export default function QuickView({product,locale,onClose,onAdd}:{product:CatalogProduct;locale:string;onClose:()=>void;onAdd:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);const titleId=useId();const en=locale==='en';
 useEffect(()=>{const node=dialog.current;if(!node)return;const previous=document.body.style.overflow;if(!node.open)node.showModal();document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[]);
 const close=()=>dialog.current?.close();
 return <dialog ref={dialog} className="quick-dialog" aria-labelledby={titleId} onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)close()}}><div className="quick-panel"><button type="button" className="dialog-close" autoFocus onClick={close} aria-label={en?'Close quick view':'Zapri hitri ogled'}><X size={21}/></button><div className="quick-picture"><ProductImage src={product.images[0]} title={product.title} sizes="(max-width:760px) 90vw, 420px"/></div><div className="quick-content"><span className="eyebrow">{categoryLabel(product.categoryPath,locale)}</span><h2 id={titleId}>{product.title}</h2><p>{product.description}</p><div className="quick-price">{formatCurrencyCents(product.priceCents,en?'en-IE':'sl-SI')}<small>{en?'VAT included':'DDV je vključen'}</small></div><button type="button" className="primary-btn" onClick={()=>{onAdd();close()}}><ShoppingBag size={18}/>{en?'Add to cart':'Dodaj v košarico'}</button><Link href={'/'+locale+'/shop/'+product.slug} className="text-link">{en?'See product details':'Poglej vse podrobnosti'}</Link>{process.env.NEXT_PUBLIC_MOCK_MODE==='true'&&<p className="quick-demo">{en?'Illustrative demo product. Availability is not verified.':'Predstavitveni izdelek. Dobavljivost ni potrjena.'}</p>}</div></div></dialog>;
}
