import Link from 'next/link';
import Stripe from 'stripe';
import { CheckCircle2, Info } from 'lucide-react';
export default async function ThankYouPage({params,searchParams}:{params:{locale:string};searchParams:{session_id?:string}}){
 const en=params.locale==='en';let paid=false;
 if(process.env.NEXT_PUBLIC_MOCK_MODE!=='true'&&process.env.STRIPE_SECRET_KEY&&searchParams.session_id?.startsWith('cs_')){try{const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:'2024-06-20'});const session=await stripe.checkout.sessions.retrieve(searchParams.session_id);paid=session.status==='complete'&&session.payment_status==='paid'}catch{}}
 return <div className="site-wrap" style={{paddingTop:65,paddingBottom:65}}><div className="empty-state">{paid?<CheckCircle2 size={44} style={{margin:'auto'}}/>:<Info size={44} style={{margin:'auto'}}/>}<h1 className="section-title" style={{margin:'25px 0'}}>{paid?(en?'Thank you for your payment':'Hvala za tvoje plačilo'):(en?'Payment is not confirmed':'Plačilo še ni potrjeno')}</h1><p>{paid?(en?'Your payment was successful. Your order confirmation will be sent after processing.':'Plačilo je bilo uspešno. Potrditev naročila prejmeš po njegovi obdelavi.'):(en?'We could not verify a completed payment. Check your email or return to your cart.':'Uspešno zaključenega plačila nismo mogli preveriti. Preveri e-pošto ali se vrni v košarico.')}</p><Link href={'/'+params.locale+(paid?'/shop':'/cart')} className="primary-btn">{paid?(en?'Explore more':'Razišči še več'):(en?'Back to cart':'Nazaj v košarico')}</Link></div></div>;
}
