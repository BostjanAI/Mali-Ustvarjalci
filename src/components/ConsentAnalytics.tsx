'use client';
import { useEffect,useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { getConsent } from '@/lib/cookies';
export default function ConsentAnalytics(){const [enabled,setEnabled]=useState(false);useEffect(()=>{const update=()=>setEnabled(getConsent()==='accepted');update();window.addEventListener('cookie-consent-changed',update);window.addEventListener('storage',update);return ()=>{window.removeEventListener('cookie-consent-changed',update);window.removeEventListener('storage',update)}},[]);return enabled?<Analytics/>:null}
