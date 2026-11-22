# Izpolnjevanje naročil in Ikonka

## Stanje

Implementirani so naslov in dobaviteljske reference na naročilu, lokalna rezervacija pred plačilom, ločene pošiljke, trajni ponovni poskusi, skrbniška vračila z idempotentno referenco in ločena uskladitev dobavitelja. Dodan je namenski adapter Ikonka ordersAPI 0.9.0 iz uradne specifikacije: https://orders-api.ikonka.eu/docs/pl in https://orders-api.ikonka.eu/openapi-pl.json .

Povezava še ni preizkušena z dejanskim uporabniškim računom Ikonka. Pravi feed, preslikave, poslovni podatki, dovoljenja za slike in dejanski katalog ostajajo odvisni od vnesenih podatkov. V razvoju ostaja demonstracijski način. Nobeno resnično naročilo ali vračilo ni bilo izvedeno med programskimi preizkusi.

## Migracije in CI

Pripravljeni sta migraciji 20261122020000_operations in 20261122021000_stock_safeguards. Pred produkcijskim prehodom naredi varnostno kopijo in v dogovorjenem okolju izvedi npx prisma migrate deploy, npx prisma generate ter novo gradnjo. Migracija ne izmisli dostavnih naslovov starih naročil. Obstoječi dnevni ali prazni interval dobaviteljev preide na @15min. Posredovanje ostane izklopljeno, dokler ga skrbnik ne vklopi.

CI uporablja izoliran PostgreSQL 16, izvede vse migracije, Jest z JSX, PostgreSQL integracijske preizkuse, regresijske preizkuse kataloga/plačil, gradnjo in Playwright. Enotski testi ne uporabljajo baze. Integracijski skript zahteva izrecen TEST_DATABASE_URL z imenom baze, ki se konča z _test. Ne uporabljaj produkcijske baze za teste.

## Zaloga in rezervacije

Inventory.quantity je zadnja potrjena količina vira. allocatedQuantity zajema odprte rezervacije in prodane količine, ki jih vir še ni dokazano vključil. Kupcu je na voljo največ quantity - allocatedQuantity; negativna razlika pomeni 0. Pogoj svežine je privzeto ena ura.

Pred Stripe sejo se izdelki zaklenejo v stalnem vrstnem redu in rezervirajo v eni transakciji PostgreSQL. Dva kupca ne moreta lokalno rezervirati zadnjega kosa. Uspešno plačilo pretvori rezervacijo v obveznost; ne zmanjša zaloge drugič. Ponovitev dogodka ima enolični ID seje.

Rezervacija traja 35 minut, vendar se ne sprosti samo zaradi pretečenega lokalnega časa. Izvajalec preveri/izteče dejansko Stripe sejo. Nejasen izid ustvarjanja seje se obnovi z isto Stripe idempotentno referenco; nejasnosti ostanejo v opozorilih. Novi checkout uporablja kartična plačila, da lokalna rezervacija ne poteče med večdnevnim plačilom.

Sinhronizacija lahko posodobi fizično količino vira, ne izbriše pa rezervacij. Po prodaji se obveznost upošteva, dokler skrbnik na podlagi svežega vira in dokazila ne potrdi, da vir vključuje naročilo. To je konservativno in lahko začasno zmanjša prodajno količino; prepreči ponovno prodajo istih lokalnih kosov ob osvežitvi vira. Ikonkin checkOnly ni oddaljena rezervacija. Razpoložljivost pri dobavitelju se lahko med preverjanjem in oddajo spremeni; zavrnitev gre v ročno obravnavo/vračilo.

## Nastavitev Ikonke

Na /sl/admin/suppliers izberi adapter ikonka in točen endpoint https://orders-api.ikonka.eu/v1/orders. Vnesi e-pošto računa v orderApiUsername ter geslo B2B računa v ločen orderAuthToken. Ključ kataloga authToken se za naročila ne uporablja. Gesla se ne izpisujejo nazaj v HTML. Omogoči dropshipping pri dobavitelju in preveri valuto računa EUR ter komercialne pogoje plačila.

Pred vklopom preveri dovoljene dostave in plačila z npx tsx scripts/checkIkonka.ts --supplier ID. To je branje /v1/catalog, brez oddaje naročila. Potrjene dostave v shippingServicesJson so JSON polje objektov s code, label, countries (SI/AT/DE/HR/IT), chargeCents (znesek dostave za kupca v EUR) in paymentMethod (bank_transfer ali bank_transfer_dropshipping). chargeCents je trgovčeva potrjena cena dostave, ne avtomatično prepisana dobaviteljeva nabavna cena. Izbere se prva potrjena storitev za državo vsakega dobavitelja; stroški mešane košarice seštejejo posamezne pošiljke.

Podprti so kurirski načini dpd_courier, gls_courier, inpost_courier in pallet_raben, kadar jih račun/dejanski checkOnly dopušča. Adapter pred ustvarjanjem plačila uporabi checkOnly:true s konkretnimi izdelki, količinami, naslovom in storitvijo. Neuspešno preverjanje ne ustvari plačila. Fiksna hitra dostava je odstranjena. Ista izbrana storitev je posneta pri rezervaciji/naročilu in prenesena dobavitelju.

Naslov za Ikonko vsebuje izrecno ime, priimek, ime ulice, hišno številko in stanovanje. Hišne številke se ne ugiba iz prostega besedila. Država se preslika na ISO3 (SI -> SVN itd.). externalId je stalni ID SupplierDispatch; pri ponovitvah se ne spremeni. Adapter pošlje HTTP Basic in izrecno obravnava 202/409/429 ter Retry-After. Zahtevki računa so omejeni s trajno časovno rezervacijo vsaj 37 sekund, da ne presegajo dokumentiranih omejitev 6/minuto in 100/uro.

Odgovor awaiting_payment pri Ikonki pomeni potrebno ureditev plačila dobavitelju, ne potrjene odpreme; nastane operativno opozorilo. Ta koda ne plačuje računa pri Ikonki. Izvajalec pridobiva naknadne sledilne številke prek /v1/orders/tracking. Sama številka ne pomeni, da je bila pošiljka dokazano odpremljena.

Lastni prevoz z nalepkami (own_*) ni ponujen za samodejni nakup. Zanj je potreben še dogovorjen prevozniški račun in ustvarjanje A6 PDF; uradni API pri takih storitvah zahteva trackingNumber in pdfBase64. Teh podatkov ne izmišljamo. Dobaviteljeve že prejete HTTPS nalepke se lahko shranijo s povratnim obvestilom in odprejo pri naročilu.

## Izvajalec in opozorila

POST /api/admin/fulfillment-worker zahteva skrbniško sejo ali glavo x-cron-secret, ki se ujema s CRON_SECRET. Izvajalec pobere zapadle pošiljke, obnovi/izteče rezervacije, preveri čakajoča Stripe vračila in pridobi sledenje Ikonke. Pošiljke imajo nextAttemptAt, časovno rezervacijo poskusa, naraščajoče zamike 1, 2, 4 ... minut (največ 6 ur) in največ 8 poskusov. Retry-After dobavitelja ima prednost. Nejasen uspeh ali trajna zavrnitev zahteva ročni pregled; ne sledi slepo ponavljanje.

GitHub workflow fulfillment.yml ima urnik na pet minut. Za dejansko aktivacijo je treba nastaviti skrivnosti FULFILLMENT_ENDPOINT_URL (objavljena HTTPS pot izvajalca) in CRON_SECRET. Brez tega workflow ne kliče nobene storitve. GitHub urnik ni jamstvo točnega časa. Na strežniku je mogoče uporabiti tudi npm run worker:fulfillment -- --apply z lastnim razporejevalnikom. Sinhronizacija vira ima ločen petnajstminutni workflow in SYNC_ENDPOINT_URL. Lokalni localhost ni cilj produkcijskega razporejevalnika.

Opozorila so trajno shranjena v OperationsAlert in vidna na /sl/admin/orders, z možnostjo označitve pregleda. Ne vsebujejo naslovov, gesel ali surovih odgovorov dobavitelja. Stripe webhook zapisuje v trajno vrsto in ne čaka več na dobavitelja.

## Vračila in uskladitev

Skrbniški gumb kliče skupno storitev v isti preverjeni prijavni seji; ni notranjega HTTP klica brez piškotka. API ima enako storitev po lastnem preverjanju skrbnika. Vsaka zahteva ima UUID requestId in trajen RefundOperation; ponavljanje iste reference uporabi isti Stripe idempotencyKey. Zneski so pozitivni celi centi in ne smejo presegati preostalega plačila. Nejasen izid se zadrži za pregled.

Vračilo denarja nikoli samo ne poveča zaloge. Naročilo se zadrži za uskladitev z dobaviteljem. Na naročilu skrbnik z dokazilom ločeno zabeleži potrditev preklica ali prejema vračila. Fizična količina še vedno izvira iz potrjenega vira. Samodejni preklic/prevzem vračil pri Ikonki v javni specifikaciji ni opisan in ostaja poslovni postopek z dobaviteljem.

Na /sl/admin/orders je vmesnik za popravek naslova pred prvim poskusom in za dokazano ročno izpolnitev. Popravek naslova ne odpravi drugih zadržanj. Pri nedobavljivosti izberi vračilo denarja; ne odstranjuj zadržanja brez poslovne razrešitve. Po že opravljenem poskusu se naročilo ne preusmerja na nov endpoint.

Za posodobitve vračil v Stripe nastavi refund.created, refund.updated in refund.failed poleg checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired in checkout.session.async_payment_failed.

## Preizkusi

npm test -- --ci --runInBand; npm run test:integration (izrecen TEST_DATABASE_URL); npm run verify:catalog; npm run verify:storefront; npm run verify:dropshipping; npm run typecheck; npm run lint; npm run build; npm run e2e. E2E sam zažene zgrajen demonstracijski strežnik in ga po preverjanju ustavi. Integracijski testi imajo navidezni Stripe in navideznega dobavitelja; ne premikajo resničnega denarja.
