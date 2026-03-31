export function computeVatBreakdown(totalCents: number, vatRate: number = 22) {
  const gross = totalCents || 0;
  const divisor = 1 + vatRate / 100;
  const net = Math.round(gross / divisor);
  const vat = gross - net;
  return { netCents: net, vatCents: vat, grossCents: gross };
}


