const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function harness({demo=true,prisma={}}={}){
 const cache=new Map();const storage=new Map();const env={NEXT_PUBLIC_MOCK_MODE:demo?'true':'false'};
 function load(file){file=path.resolve(root,file);if(!fs.existsSync(file)&&fs.existsSync(file+'.ts'))file+='.ts';if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const req=id=>{if(id==='@/lib/prisma')return {prisma};if(id==='@/lib/rateLimit')return {rateLimit:()=>true};if(id.startsWith('@/'))return load('src/'+id.slice(2));if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id));return require(id)};
 vm.runInNewContext('(function(require,module,exports,process,localStorage){'+compiled+'\n})',{console,Request,Response,URL,URLSearchParams,setTimeout,clearTimeout,fetch},{filename:file})(req,module,module.exports,{env},localStorage);return module.exports;
 }
 return {load,env,storage};
}
async function verify(){let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
 const h=harness();const catalog=h.load('src/lib/catalog.ts');
 check('malformed pagination has safe defaults',()=>{assert.equal(catalog.positiveInt('NaN',1),1);assert.equal(catalog.positiveInt('-1',12),12);assert.equal(catalog.positiveInt('100',12,48),48)});
 check('price filters preserve cents and reject non-finite values',()=>{assert.equal(catalog.priceLimit('14.99'),1499);assert.equal(catalog.priceLimit('Infinity'),undefined);assert.equal(catalog.priceLimit(''),undefined)});
 const middleware=h.load('src/middleware.ts');const routePattern=new RegExp('^'+middleware.config.matcher[0]+'$');check('middleware covers locale pages and excludes API and assets',()=>{assert.ok(routePattern.test('/sl/legal/terms'));assert.ok(routePattern.test('/sl/shop'));assert.ok(!routePattern.test('/api/search'));assert.ok(!routePattern.test('/images/play-hero.webp'))});
 const api=h.load('src/app/api/search/route.ts');const search=async query=>{const r=await api.GET(new Request('https://example.test/api/search?'+query));return {status:r.status,...await r.json()}};
 let data=await search('category=art-craft&maxPrice=10');check('category and price filters combine',()=>{assert.equal(data.total,1);assert.equal(data.items[0].id,'p2')});
 data=await search('q=lisička');check('Slovenian product search works',()=>assert.equal(data.items[0].id,'p1'));
 data=await search('q=lisicka');check('search tolerates missing accents',()=>assert.equal(data.items[0].id,'p1'));
 data=await search('q=fox&locale=en');check('English search and localized names work',()=>assert.equal(data.items[0].title,'Wooden toy fox'));
 data=await search('sort=price_asc&pageSize=2&page=2');check('sorting and pagination combine',()=>assert.deepEqual(Array.from(data.items,p=>p.priceCents),[1499,1899]));
 data=await search('category=educational-games');check('empty categories return a real empty state',()=>assert.equal(data.total,0));
 data=await search('minPrice=20&maxPrice=10');check('invalid price ranges return 400',()=>assert.equal(data.status,400));
 data=await search('page=NaN&pageSize=Infinity');check('invalid pagination never leaks NaN',()=>{assert.equal(data.page,1);assert.equal(data.pageSize,12)});
 const detail=h.load('src/lib/getProduct.ts');const product=await detail.getProduct('wooden-toy-fox','sl');check('demo product details work without a database',()=>assert.equal(product.title,'Lesena lisička'));
 const missing=await detail.getProduct('missing','sl');check('unknown slugs return null',()=>assert.equal(missing,null));
 const {useCartStore}=h.load('src/lib/cartStore.ts');await useCartStore.persist.rehydrate();useCartStore.getState().addItem({id:'p1',title:'Fox',priceCents:1899},2);useCartStore.getState().addItem({id:'p1',title:'Fox',priceCents:1899},1);check('cart merges duplicate products and totals cents',()=>{assert.equal(useCartStore.getState().items[0].quantity,3);assert.equal(useCartStore.getState().totalCents(),5697)});
 useCartStore.getState().updateQty('p1',NaN);useCartStore.getState().addItem({id:'p2',title:'Bad price',priceCents:-1});check('invalid quantities and prices cannot corrupt cart',()=>{assert.equal(useCartStore.getState().items.length,1);assert.equal(useCartStore.getState().items[0].quantity,3)});
 check('cart is persisted to storage',()=>assert.ok(h.storage.get('mali-ustvarjalci-cart-v1').includes('p1')));
 const {priceCart,cartMetadata,readCartMetadata}=h.load('src/lib/checkoutPricing.ts');const priced=priceCart([{id:'p1',quantity:2},{id:'p1',quantity:1}],[{id:'p1',slug:'fox',title:'Canonical title',priceCents:1899,currency:'EUR',inventory:{quantity:5,syncedAt:new Date().toISOString()}}]);check('checkout derives canonical price and merges quantities',()=>{assert.equal(priced[0].priceCents,1899);assert.equal(priced[0].quantity,3)});
 check('checkout rejects unavailable products and stock',()=>{assert.throws(()=>priceCart([{id:'missing',quantity:1}],[]));assert.throws(()=>priceCart([{id:'p1',quantity:6}],[{id:'p1',slug:'fox',title:'Fox',priceCents:1899,currency:'EUR',inventory:{quantity:5,syncedAt:new Date().toISOString()}}]))});
 const largeCart=Array.from({length:20},(_,i)=>({...priced[0],id:'p'+i,title:'Long product name '.repeat(25)}));const meta=cartMetadata(largeCart);check('Stripe metadata chunks round-trip with each value below 500 characters',()=>{assert.ok(Object.values(meta).every(s=>s.length<=450));assert.equal(JSON.stringify(readCartMetadata(meta)),JSON.stringify(largeCart))});
 const retired=h.load('src/app/api/checkout/route.ts');const retiredResponse=await retired.POST();check('old stub cannot confirm a failed purchase',()=>assert.equal(retiredResponse.status,410));
 const payment=h.load('src/app/api/stripe/route.ts');const demoPayment=await payment.POST(new Request('https://example.test/api/stripe',{method:'POST'}));check('demo checkout cannot charge or create an order',()=>assert.equal(demoPayment.status,409));
 const failing=harness({demo:false,prisma:{product:{findMany:()=>Promise.reject(new Error('offline')),count:()=>Promise.resolve(0)}}});const unavailable=await failing.load('src/app/api/search/route.ts').GET(new Request('https://example.test/api/search'));check('catalogue failure returns 503',()=>assert.equal(unavailable.status,503));
 console.log(checks+' storefront checks passed');return checks;
}
module.exports={verify};if(require.main===module)verify().catch(e=>{console.error(e);process.exitCode=1});
