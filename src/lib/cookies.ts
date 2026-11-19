export function getConsent(): 'accepted' | 'rejected' | null {
 if(typeof window==='undefined')return null;try{const value=localStorage.getItem('cookie-consent');return value==='accepted'||value==='rejected'?value:null}catch{return null}
}
export function setConsent(value:'accepted'|'rejected'){
 if(typeof window==='undefined')return;try{localStorage.setItem('cookie-consent',value)}catch{}window.dispatchEvent(new Event('cookie-consent-changed'));
}
