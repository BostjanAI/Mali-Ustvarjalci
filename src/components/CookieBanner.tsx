'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getConsent,setConsent } from '@/lib/cookies';
export default function CookieBanner(){
 const locale=useParams<{locale:string}>()?.locale||'sl';const en=locale==='en';const [visible,setVisible]=useState(false);useEffect(()=>setVisible(!getConsent()),[]);if(!visible)return null;
 return <section className="cookie-panel" aria-label={en?'Cookie preferences':'Nastavitve piškotkov'}><p>{en?'We save your cart on this device. Optional analytics is enabled only with your consent.':'Košarico shranimo na tej napravi. Neobvezno analitiko vključimo le s tvojim soglasjem.'}{' '}<Link className="text-link" style={{fontSize:'inherit'}} href={'/'+locale+'/legal/cookies'}>{en?'More information':'Več informacij'}</Link></p><div className="cookie-actions"><button className="secondary-btn" onClick={()=>{setConsent('rejected');setVisible(false)}}>{en?'Necessary only':'Samo nujni'}</button><button className="primary-btn" onClick={()=>{setConsent('accepted');setVisible(false)}}>{en?'Accept analytics':'Sprejmi analitiko'}</button></div></section>;
}
