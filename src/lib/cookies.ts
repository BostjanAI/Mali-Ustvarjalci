export function getConsent(): 'accepted' | 'rejected' | null {
  if (typeof document === 'undefined') return null;
  return (localStorage.getItem('cookie-consent') as any) || null;
}

export function setConsent(value: 'accepted' | 'rejected') {
  if (typeof document === 'undefined') return;
  localStorage.setItem('cookie-consent', value);
}


