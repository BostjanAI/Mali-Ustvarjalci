export function formatCurrencyCents(amountCents: number, locale: string = 'sl-SI', currency: string = 'EUR') {
  const amount = (amountCents || 0) / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}



