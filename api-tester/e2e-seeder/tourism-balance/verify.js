const assert=require('node:assert/strict');
const {connect}=require('../expansion/db');
const {fs,path,dir,save,hash}=require('./common');
const {hamming}=require('../real-expansion/upload-images');
async function get(base,url){const r=await fetch(base+url,{signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,base+url);return r.json();}
async function pool(items,n,fn){let index=0;const out=[];await Promise.all(Array.from({length:n},async()=>{while(index<items.length){const k=index++;out[k]=await fn(items[k]);}}));return out;}
async function main(){
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))),receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json'))),report={checkedAt:new Date().toISOString(),batchId:plan.batchId,checks:{},api:[]};
 assert.equal(receipt.status,'committed');assert.equal(receipt.planSha256,hash(fs.readFileSync(path.join(dir,'plan.json'))));assert.ok(receipt.protectedUnchanged);report.checks.protectedDataAtCommit=true;
 const c=await connect('CatalogandListing'),b=await connect('BookingandInventory');
 try{
  const ids=plan.listings.map(x=>x.id),parentIds=plan.complexes.map(x=>x.id);
  const listings=(await c.query('SELECT * FROM listings WHERE id=ANY($1::uuid[])',[ids])).rows,parents=(await c.query('SELECT * FROM complexes WHERE id=ANY($1::uuid[])',[parentIds])).rows;
  assert.equal(listings.length,170);assert.equal(parents.length,17);
  for(const l of listings){const x=plan.listings.find(x=>x.id===l.id);assert.equal(l.status,'ACTIVE');assert.equal(l.title,x.title);assert.equal(l.host_id,x.hostId);assert.equal(l.complex_id,x.complexId);assert.deepEqual(l.attributes,x.attributes);assert.ok(l.title_normalized);assert.equal(Number(l.average_rating),0);assert.equal(l.total_reviews,0);}
  for(const p of parents){assert.equal(p.status,'ACTIVE');const children=listings.filter(x=>x.complex_id===p.id);assert.ok(children.length);assert.ok(children.every(l=>l.host_id===p.host_id));}
  assert.equal((await c.query('SELECT count(*)::int n FROM real_catalog_source_provenance WHERE batch_id=$1',[plan.batchId])).rows[0].n,plan.sources.length);
  for(const table of ['listings','complexes'])assert.equal((await c.query(`SELECT count(*)::int n FROM ${table} WHERE id=ANY($1::uuid[]) AND status='HIDDEN'`,[plan.patches[table].map(x=>x.id)])).rows[0].n,plan.patches[table].length);
  assert.equal((await c.query("SELECT count(*)::int n FROM listings WHERE id=ANY($1::uuid[]) AND status='ACTIVE'",[plan.pinnedExistingListingIds])).rows[0].n,plan.pinnedExistingListingIds.length);
  const coverage=(await c.query("SELECT province,count(*) FILTER(WHERE category='STAY')::int stay,count(*) FILTER(WHERE category='EXP')::int exp,count(*) FILTER(WHERE category='SVC')::int svc FROM listings WHERE status='ACTIVE' GROUP BY province ORDER BY province")).rows;
  assert.equal(coverage.length,34);assert.ok(coverage.every(x=>x.stay>0&&x.exp>0&&x.svc>0));report.coverage=coverage;
  const inventory=(await b.query('SELECT listing_id,count(*)::int n,min(date)::text first,max(date)::text last,min(available_quantity)::int minimum FROM inventory_calendars WHERE listing_id=ANY($1::uuid[]) GROUP BY listing_id',[ids])).rows;
  assert.equal(inventory.length,ids.length);for(const x of inventory){const l=plan.listings.find(l=>l.id===x.listing_id);assert.equal(x.n,91*(l.category==='STAY'?1:2));assert.equal(x.first,plan.inventoryStart);assert.equal(x.last,'2027-01-07');assert.ok(x.minimum>0);}
  report.checks.catalogOwnerRelationsAndProvenance=true;report.checks.all34ProvincesHaveAllCategories=true;report.checks.inventory91Days=true;report.inventoryCalendarRows=inventory.reduce((n,x)=>n+x.n,0);
  const photos=plan.sources.flatMap(s=>s.photos.map(p=>({...p,recordId:s.recordId}))),baseline=Object.values(JSON.parse(fs.readFileSync(path.join(dir,'.cache/baseline-images.json'))));
  assert.equal(new Set(photos.map(x=>x.optimizedSha256)).size,photos.length);
  for(const p of photos){assert.equal(new URL(p.secureUrl).hostname,'res.cloudinary.com');assert.ok(new URL(p.secureUrl).pathname.startsWith('/p1kxfhlw/image/upload/'));assert.ok(p.verifiedAt);assert.ok(!baseline.some(x=>x.sha256===p.sha256||hamming(x.dhash,p.dhash)<=4));}
  const existing=(await c.query("SELECT thumbnail_url,attributes->'galleryUrls' galleries FROM listings WHERE status='ACTIVE' UNION ALL SELECT thumbnail_url,gallery_urls galleries FROM complexes WHERE status='ACTIVE'")).rows;
  const allUrls=[...new Set(existing.flatMap(x=>[x.thumbnail_url,...(x.galleries||[])]).filter(Boolean))];assert.ok(allUrls.every(u=>new URL(u).hostname==='res.cloudinary.com'));
  report.photographs={new:photos.length,uniqueNew:photos.length,noExactOrNearDuplicateAgainstPreviousActivePhotos:true,activeCatalogUniqueUrls:allUrls.length,activeCatalogExternalImageUrls:0};report.checks.cloudinaryAndImageUniqueness=true;
 }finally{await Promise.all([c.end(),b.end()]);}
 const local='http://127.0.0.1:5555',publicBase='https://gotravel.trungcaodev.io.vn';
 const details=await pool(plan.listings,4,async l=>{const j=await get(local,'/api/v1/catalog/listings/'+l.id);assert.equal(j.data?.id,l.id);assert.equal(j.data?.attributes?.categoryType,l.attributes.categoryType);return{id:l.id,category:l.category,subCategory:l.subCategory,status:200};});report.api.push({base:local,endpoint:'catalog/listings/:id',checked:details.length,all200:true});
 for(const category of ['STAY','EXP','SVC']){let offset=0,items=[];for(let n=0;n<12;n++){const j=await get(local,`/api/v1/search/listings?category=${category}&limit=100&offset=${offset}`);const rows=j.data;assert.ok(Array.isArray(rows));items.push(...rows);offset+=rows.length;if(rows.length<100)break;}
  const expected=plan.listings.filter(l=>l.category===category);assert.ok(expected.every(l=>items.some(x=>x.id===l.id)));assert.ok(!items.some(x=>plan.patches.listings.some(p=>p.id===x.id)));report.api.push({base:local,endpoint:'search/listings',category,visible:items.length,newFound:expected.length});
 }
 const svcTypes=[...new Set(plan.listings.filter(l=>l.category==='SVC').map(l=>l.subCategory))];
 for(const subCategory of svcTypes){const j=await get(publicBase,`/api/v1/search/listings?category=SVC&subCategory=${subCategory}&limit=100`);assert.ok(j.data.length>0&&j.data.every(x=>x.subCategory===subCategory));report.api.push({base:publicBase,endpoint:'search/listings',subCategory,status:200,visible:j.data.length});}
 report.complexes=await pool(plan.complexes,3,async p=>{const detail=await get(publicBase,`/api/v1/recommendations/complexes/${p.id}/detail`),children=await get(publicBase,`/api/v1/recommendations/complexes/${p.id}?limit=100`),expected=plan.listings.filter(l=>l.complexId===p.id);assert.equal(detail.id,p.id);assert.equal(detail.listingCount,expected.length);assert.equal(children.length,expected.length);assert.ok(expected.every(l=>children.some(x=>x.id===l.id&&x.complexId===p.id)));
  const photo=await fetch(p.thumbnailUrl,{method:'HEAD',signal:AbortSignal.timeout(20000)});assert.equal(photo.status,200);assert.ok(photo.headers.get('content-type')?.startsWith('image/'));return{id:p.id,name:p.name,province:p.province,STAY:expected.filter(x=>x.category==='STAY').length,EXP:expected.filter(x=>x.category==='EXP').length,SVC:expected.filter(x=>x.category==='SVC').length,detailStatus:200,childrenStatus:200,coverStatus:200,url:publicBase+'/complex/'+p.id+'/detail'};
 });
 const sample=[plan.listings.find(x=>x.category==='STAY'),plan.listings.find(x=>x.category==='EXP'),plan.listings.find(x=>x.category==='SVC')];
 for(const l of sample){const j=await get(publicBase,`/api/v1/public/inventory/listings/${l.id}/availability?startDate=${plan.inventoryStart}&endDate=${plan.inventoryStart}`);assert.ok(Array.isArray(j.data)&&j.data.length>0);report.api.push({base:publicBase,endpoint:'inventory/availability',category:l.category,listingId:l.id,status:200,slots:j.data.length});}
 report.checks.publicGatewayCatalogSearchComplexAndInventory=true;report.status='passed';save(path.join(dir,'verification.json'),report);console.log(JSON.stringify({status:report.status,checks:report.checks,newPhotos:report.photographs.new,activeCatalogExternalImages:report.photographs.activeCatalogExternalImageUrls,listingDetailResponses:details.length,publicComplexResponses:report.complexes.length,calendarRows:report.inventoryCalendarRows}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
