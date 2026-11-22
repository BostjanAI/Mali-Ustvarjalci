# Dostava in posredovanje naročil

## Kaj se shrani

Plačano naročilo vsebuje stripeCheckoutSessionId, status paid, dostavni naslov v shippingAddressJson (ime, vrstica 1, vrstica 2, kraj, poštna številka, regija, država, telefon) ter dobaviteljeve reference na postavkah. Naslov iz shipping_details zaključene Stripe seje ima prednost pred podatki obrazca; obračunski naslov se ne uporabi za dostavo. Če dostavni podatki manjkajo ali so neveljavni, plačano naročilo ostane zadržano za ročni pregled.

Enolični ID seje in transakcija preprečita ponovljen vnos naročila in ponovljeno zmanjšanje zaloge ob podvojenih ali sočasnih obvestilih. Ob pomanjkanju zaloge naročilo ostane plačano, vendar se ne posreduje samodejno. Stari podatki se ne dopolnjujejo z ugibanjem; stare seje brez dobaviteljskega posnetka zahtevajo ročni pregled. Ponovitev starega PaymentIntent ne ustvari novega naročila.

Obvestila checkout.session.completed in checkout.session.async_payment_succeeded uporabljajo isti postopek. Neporavnana plačila ne sprožijo naročila. Seja s potrjenim zneskom 0 se lahko izpolni tudi s statusom no_payment_required. Webhook ponovno pridobi sejo prek pripete različice API 2024-06-20. V Stripe nastavi oba dogodka na obstoječo pot /api/stripe-webhook.

## Nastavitev dobavitelja

Na /sl/admin/suppliers ima vsak dobavitelj svoj apiUrl, orderAuthToken, orderWebhookToken in orderForwardingEnabled. Ključ kataloga authToken je ločen. Shranjeni ključi se ne izpisujejo v obrazec. Globalna SUPPLIER_ORDER_URL in SUPPLIER_API_KEY se za naročila ne uporabljata več. Obstoječi dobavitelji imajo posredovanje privzeto izključeno.

Pred vklopom je treba potrditi in preizkusiti dejansko dobaviteljevo pogodbo API. Vgrajen je izrecen generični protokol v1, ne univerzalni adapter za poljubnega dobavitelja. Če dobavitelj uporablja drugo obliko podatkov ali avtentikacije, je treba prilagoditi adapter. URL mora biti HTTPS brez prijavnih podatkov ali ključev v poizvedbi; preusmeritve se ne sledijo.

## Pogodba naročil v1

POST na apiUrl uporablja Content-Type application/json, Authorization Bearer z ločenim orderAuthToken in Idempotency-Key z ID-jem SupplierDispatch. Telo ima:

- version: 1
- reference: ID posredovanja (stalna enolična referenca)
- orderId: ID naročila trgovine
- contact: email in phone
- shippingAddress: name, line1, line2, city, postalCode, state, country, phone
- items: samo supplierProductId in quantity za tega dobavitelja

Dobavitelj mora reference/Idempotency-Key trajno deduplicirati in pri ponovitvi vrniti isto zunanje naročilo. Uspešen odgovor je HTTP 2xx z JSON objektom, ki vsebuje neprazen id (niz ali število; največ 150 znakov). Dobavitelj ne prejme celotnega zneska košarice ali izdelkov drugih dobaviteljev.

Zapis SupplierDispatch nastane v isti transakciji kot plačano naročilo in vsebuje nespremenljiv posnetek zahtevka. Različni dobavitelji imajo ločene zunanje ID-je in statuse. Začasna napaka ali prekinjena povezava ohrani zapis; ponovitev uporabi isto referenco in telo. Potrjeno posredovanje se ne pošilja ponovno. Sprememba naslova API po poskusu zahteva pregled. Uspeh brez veljavnega zunanjega ID-ja ali trajna napaka 4xx zahteva ročno razrešitev.

## Ponovni poskusi in pregled

Na /sl/admin/orders sta vidna shranjeni dostavni naslov in stanje vsakega dobavitelja. Skrbnik lahko ponovno sproži posredovanje; potrjene pošiljke se preskočijo. Naročila z fulfillmentHold ali brez potrjenih naslovov/reference se ne posredujejo. Razrešitev zadržanega naročila je poslovni postopek; v tej različici ni obrazca za popravljanje že potrjenih naročil in samodejnega odpravljanja zadržanj.

Za začasno napako API vrne Stripe webhook 503, zato lahko Stripe obvestilo ponovi. Sočasni poskusi imajo dvominutno časovno rezervacijo; zahtevek ima 15-sekundno omejitev. Mehanizem ne jamči odsotnosti dvojnikov pri partnerju, ki ne podpira trajne deduplikacije. Po izteku Stripe ponovitev je potreben skrbniški pregled in ročni ponovni poskus. Samostojen razporejevalnik ni vključen.

## Povratna obvestila

POST /api/supplier-webhook zahteva x-supplier-id (ID dobavitelja iz trgovine) in x-api-key (njegov orderWebhookToken). Telo vsebuje supplierOrderId, status (pending, confirmed, shipped, cancelled ali refunded) in neobvezni trackingNumber. Iskanje je omejeno na dobavitelja in njegov zunanji ID naročila. Podvojena/starejša obvestila ne vrnejo statusa nazaj in ne ponovijo obvestila o odpremi. Povratni status refunded ne izvede finančnega vračila v Stripe.

Ključe in naslove hrani ustrezno varovane v okolju/bazi, naslove kupcev pa obravnavaj kot osebne podatke. Dnevniki napak ne vsebujejo dostavnih podatkov, ključev ali surovih odgovorov dobavitelja.

## Migracija in preverjanje

Migracija prisma/migrations/20261122010000_order_delivery_dispatch je pripravljena. Pred uporabo sledi varnostna kopija baze in npx prisma migrate deploy v pravilnem okolju. Sledi npx prisma generate in nova gradnja. Migracija ne izmisli naslovov ali dobaviteljev za stara naročila ter ne vklopi dejanskega posredovanja. Starih že posredovanih naročil ne pošiljaj ponovno brez preverjanja pri dobavitelju.

Preizkusi: npm run verify:dropshipping, npm run verify:storefront, npm run verify:catalog, npm run typecheck, npm run lint in npm run build. Regresijski preizkusi uporabljajo navidezno transakcijsko bazo in navidezne dobavitelje; pred produkcijo je še potreben integracijski preizkus na migrirani testni bazi ter v dobaviteljevem testnem okolju.

Podlaga za Stripe tok: https://docs.stripe.com/checkout/fulfillment in https://docs.stripe.com/api/checkout/sessions/object?api-version=2024-06-20 .
