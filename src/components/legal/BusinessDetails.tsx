import { business, businessReady } from '@/lib/business';
export default function BusinessDetails({ locale }: { locale: string }) {
  const en = locale === 'en';
  const fields = [
    [en ? 'Operator' : 'Upravljavec', business.legalName],
    [en ? 'Registered office' : 'Sedež', business.registeredAddress],
    [
      en ? 'Registration number' : 'Matična številka',
      business.registrationNumber,
    ],
    [en ? 'Tax number' : 'Davčna številka', business.taxNumber],
    [
      en ? 'VAT status' : 'Status DDV',
      business.vatRegistered === true
        ? en
          ? 'VAT registered'
          : 'Zavezanec za DDV'
        : business.vatRegistered === false
          ? en
            ? 'Not VAT registered'
            : 'Ni zavezanec za DDV'
          : '',
    ],
    [en ? 'VAT ID' : 'Identifikacija za DDV', business.vatId],
    [en ? 'Register' : 'Register', business.registerName],
    [en ? 'Register entry' : 'Vpis v register', business.registerEntry],
    [en ? 'Share capital' : 'Osnovni kapital', business.shareCapital],
    [en ? 'Email' : 'E-pošta', business.email],
    [en ? 'Phone' : 'Telefon', business.phone],
    [en ? 'Returns address' : 'Naslov za vračila', business.returnsAddress],
  ];
  return (
    <section className="business-details">
      <h2>{en ? 'Operator details' : 'Podatki upravljavca'}</h2>
      {!businessReady() && (
        <p className="business-pending">
          {en
            ? 'Verified operator details are still being completed. Purchasing is not enabled.'
            : 'Preverjeni podatki upravljavca se še dopolnjujejo. Nakup ni omogočen.'}
        </p>
      )}
      <dl>
        {fields
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
