# Prehod na pravi katalog

Tehnična podpora je pripravljena. Dejanski dobavitelj, preverjena dokumentacija in podatki podjetja še niso vneseni. Datoteka .env se ne pošilja v Git. Demonstracijski način ostane vključen do potrjenega prehoda.

## 1. Podatki upravljavca

V config/business.json vnesi preverjene javne podatke: legalName (polna firma), registeredAddress (sedež), registrationNumber (matična), taxNumber (davčna), vatRegistered (true/false), vatId (če je zavezanec), email, phone in returnsAddress. Po potrebi dopolni registerName, registerEntry, shareCapital in privacyEmail. Kontakt za zasebnost privzeto uporablja email. Prazne vrednosti niso veljavni poslovni podatki. Naslov vračil je lahko enak sedežu, vendar naj bo izrecno vnesen.

Skupni podatki se izpišejo na pravnih straneh in v nogi. DDV je odvisen od vnesenega statusa. Dokler osnovni podatki niso popolni, pravi plačilni API nakup zavrne. Pravna besedila potrebujejo še poslovni pregled dejanskih pogojev dostave, vračil, plačil in reklamacij.

## 2. Dobavitelj in kategorije

Potrebujemo ime dobavitelja, pogodbeno dovoljenje za uporabo podatkov in slik, dokumentacijo vira, cene za kupca v EUR ter pomen in pogostost osveževanja zaloge. Uvoz pričakuje prodajno ceno, ne nabavne cene. Pretvorba marže ali DDV ni samodejna.

Dobavitelja vnese skrbnik na /sl/admin/suppliers ali nastavi SUPPLIER_NAME, SUPPLIER_FEED_URL in SUPPLIER_API_KEY v lokalnem okolju. Ključ se nikoli ne pošilja v javni config. Okoljski dobavitelj ima stalen ključ environment-supplier; pri dobavitelju iz baze uporabi njegov ID.

config/supplier-categories.json ima objekt default in objekt suppliers, katerega ključi so ID-ji dobaviteljev. Vrednosti pravil morajo biti natančni identifikatorji iz src/lib/catalog.ts:

- wooden-toys
- art-craft
- educational-games
- outdoor-play
- books-puzzles
- diy-kits

Vsako pravilo je par izvirna kategorija: identifikator. Pravilo konkretnega dobavitelja ima prednost pred default. Razlike velikih črk, naglasov, podčrtajev in presledkov se normalizirajo. Kanonični ID ali polno ime obstoječe kategorije se prepozna tudi brez pravila. Kategorije Montessori ni smiselno avtomatično enačiti z eno skupino izdelkov: preslikaj natančne poti po pregledu ponudbe. Neprepoznana kategorija pusti izdelek v osnutku.

## 3. Vhodni podatki in varen poskus

Predloga docs/catalog-template.csv vsebuje samo glave, brez izmišljenih izdelkov. Podprti so CSV (vejica ali podpičje), JSON (polje izdelkov ali items) ter XML (items/item ali rss/channel/item). Če je dejanska struktura drugačna, pred uvozom prilagodi adapter dobavitelju.

Obvezni so id, title in pozitivna price v EUR. quantity je potrjena nenegativna celoštevilčna količina. Prazna quantity pomeni neznano zalogo in ne osveži stare potrditve. images je seznam HTTPS povezav, ločen z | ali JSON polje. Starost je v mesecih; vrednost 0 je veljavna in se ne nadomesti z ugibanjem. Ostala varnostna polja so v predlogi.

Najprej izvedi npm run import:products -- pot/do/kataloga.csv --supplier ID. To je privzeto samo preverjanje brez sprememb baze. Za oddaljeni vir uporabi npm run sync:supplier (prav tako samo preverjanje). Poročilo izpiše nepreslikane kategorije in manjkajoče podatke. Dejanski zapis zahteva dodatek --apply. Lokalni uvoz zahteva že obstoječega dobavitelja.

Prazen ali neveljaven vir se zavrne pred zapisom. Napaka vira ne zamenja izdelkov z demonstracijskimi in ne deaktivira kataloga. Brisanje manjkajočih izdelkov je privzeto izključeno v config/supplier-import.json; vključi ga le za potrjen popoln vir konkretnega dobavitelja. ID izdelka je omejen na njegovega dobavitelja.

## 4. Pregled pred objavo

Novi izdelki se uvozijo kot osnutki. Na /sl/admin/products preveri kategorijo, dejanske slike in pravice do uporabe, starost, opozorila, slovenska navodila, proizvajalca ter odgovorno osebo v EU, kadar je potrebna. Hraniti je treba dokazila, ne zgolj povezav. Za sliko preveri pravi izdelek/različico, dostopnost, ločljivost in dovoljenje; HTTPS povezava sama tega ne potrjuje. Skrbnik izrecno potrdi slike in podatke pred objavo. Samodejni uvoz ne more potrditi skladnosti izdelka.

Ob spremembi opisov, kategorije ali varnostnih podatkov se izdelek vrne v pregled. Spremenjene slike ali vir pravic prekličejo tudi potrditev slik. SUPPLIER_IMAGE_HOSTS mora vključevati dogovorjene domene slik; sprememba zahteva novo gradnjo. Ne vnašaj splošnih nadomestnih opozoril, izmišljene starosti ali nepreverjenih navodil.

Zaloga ima čas potrditve. Starejša od stockMaxAgeHours (privzeto 24 ur) se obravnava kot neznana; takšnega izdelka ni mogoče dodati v košarico ali plačati. Pogostost uskladi z dejanskimi jamstvi dobavitelja in režimom prodaje. Tehnični podatek ne rezervira zaloge pri dobavitelju; pred prodajo je potreben dogovor o rezervacijah in dobavljivosti.

## 5. Prehod baze in zagon

Migracija prisma/migrations/20261120010000_catalog_details je pripravljena, vendar se ne izvede pri uvozu ali gradnji. Pred izvedbo varnostno kopiraj pravo bazo in preveri podvojene pare supplierId/supplierProductId. Migracija doda enoličnost tega para; obstoječe duplikate je treba poslovno razrešiti pred migracijo.

Nato v dogovorjenem okolju izvedi npx prisma migrate deploy in npx prisma generate. Stari izdelki nimajo potrditev: v pravem načinu so skriti do pregleda. Izvedi poskusni uvoz, preslikaj kategorije, preveri cene, podatke in slike, šele nato izvedi dejanski uvoz ter objave. Prehod iz NEXT_PUBLIC_MOCK_MODE=true na false zahteva novo gradnjo. AUTH_MODE naj v produkciji ne bo mock. Preveri plačilne in e-poštne nastavitve.

Preverjanje: npm run verify:catalog, npm run verify:storefront, npm run typecheck in npm run build. Ti preizkusi preverjajo programsko vedenje, ne resničnosti dobaviteljevih trditev.

Viri za poslovni pregled: https://spot.gov.si/sl/teme/spletna-prodaja/ in https://www.gov.si/teme/varnost-igrac/ .
