'use client';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { useToast } from '@/components/ui/Toast';
export default function AddToCartButton({ product, locale = 'sl' }: { product: { id: string; slug: string; title: string; priceCents: number; image?: string }; locale?: string }) {
 const en=locale==='en';const [quantity,setQuantity]=useState(1);const addItem=useCartStore(s=>s.addItem);const {addToast}=useToast();
 return <div className="detail-buy"><label><span className="sr-only">{en?'Quantity':'Količina'}</span><input className="quantity-input" style={{height:'100%'}} type="number" min="1" max="99" value={quantity} onChange={e=>setQuantity(Math.min(99,Math.max(1,Number(e.target.value)||1)))}/></label><button className="primary-btn" style={{flex:1}} onClick={()=>{addItem(product,Math.floor(quantity));addToast(en?'Added to your cart.':'Izdelek je v košarici.','success')}}><ShoppingBag size={19}/>{en?'Add to cart':'Dodaj v košarico'}</button></div>;
}
