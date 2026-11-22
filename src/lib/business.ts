import configured from '../../config/business.json';
export type BusinessDetails = {
  legalName: string;
  registeredAddress: string;
  registrationNumber: string;
  taxNumber: string;
  vatRegistered: boolean | null;
  vatId: string;
  email: string;
  phone: string;
  returnsAddress: string;
  registerName: string;
  registerEntry: string;
  shareCapital: string;
  privacyEmail: string;
};
export const business: BusinessDetails = configured;
export function missingBusinessFields(data: BusinessDetails = business) {
  const missing = (
    [
      'legalName',
      'registeredAddress',
      'registrationNumber',
      'taxNumber',
      'email',
      'phone',
      'returnsAddress',
    ] as const
  ).filter((key) => !data[key].trim()) as string[];
  if (data.vatRegistered === null) missing.push('vatRegistered');
  if (data.vatRegistered && !data.vatId.trim()) missing.push('vatId');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    missing.push('validEmail');
  return missing;
}
export function businessReady(data: BusinessDetails = business) {
  return missingBusinessFields(data).length === 0;
}
export function legalIdentity(locale: string) {
  if (!businessReady())
    return locale === 'en'
      ? 'The operator’s verified details have not yet been entered. Purchasing is not enabled.'
      : 'Preverjeni podatki upravljavca še niso vneseni. Nakup ni omogočen.';
  return [
    business.legalName,
    business.registeredAddress,
    (locale === 'en' ? 'Registration no.: ' : 'Matična številka: ') +
      business.registrationNumber,
    (locale === 'en' ? 'Tax no.: ' : 'Davčna številka: ') + business.taxNumber,
    (locale === 'en' ? 'Contact: ' : 'Kontakt: ') + business.email,
  ].join('; ');
}
export function renderLegalBody(template: string, locale: string) {
  return template
    .replaceAll('{{operator}}', legalIdentity(locale))
    .replaceAll(
      '{{privacyEmail}}',
      business.privacyEmail ||
        business.email ||
        (locale === 'en'
          ? 'contact details pending'
          : 'kontaktni podatki še niso vneseni'),
    )
    .replaceAll(
      '{{contactEmail}}',
      business.email ||
        (locale === 'en'
          ? 'contact details pending'
          : 'kontaktni podatki še niso vneseni'),
    )
    .replaceAll(
      '{{returnsAddress}}',
      business.returnsAddress ||
        (locale === 'en'
          ? 'return address pending'
          : 'naslov za vračila še ni vnesen'),
    )
    .replaceAll(
      '{{vatStatement}}',
      business.vatRegistered === true
        ? locale === 'en'
          ? 'Prices include VAT.'
          : 'Cene vključujejo DDV.'
        : business.vatRegistered === false
          ? locale === 'en'
            ? 'The seller is not VAT registered. VAT is not charged.'
            : 'Prodajalec ni zavezanec za DDV. DDV se ne obračuna.'
          : locale === 'en'
            ? 'VAT status has not yet been confirmed.'
            : 'Status zavezanca za DDV še ni potrjen.',
    );
}

export function vatLabel(locale: string) {
  return business.vatRegistered === true
    ? locale === 'en'
      ? 'VAT included'
      : 'DDV je vključen'
    : business.vatRegistered === false
      ? locale === 'en'
        ? 'VAT not charged'
        : 'DDV se ne obračuna'
      : locale === 'en'
        ? 'VAT status pending'
        : 'Status DDV še ni potrjen';
}
