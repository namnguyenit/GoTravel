const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {connect}=require('../expansion/db');const {dir,save}=require('./helpers');
async function main(){
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))),receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));assert.equal(receipt.status,'committed');assert.equal(receipt.protectedUnchanged,true);
 const out={batchId:plan.batchId,checkedAt:new Date().toISOString(),checks:{protectedPriorDataUnchanged:true},api:[]};
 const c=await connect('CatalogandListing'),b=await connect('BookingandInventory'),i=await connect('Identity');
 try{
  const ids=plan.listings.map(x=>x.id),pids=plan.complexes.map(x=>x.id),rows=(await c.query('SELECT * FROM listings WHERE id=ANY($1::uuid[]) ORDER BY id',[ids])).rows,parents=(await c.query('SELECT * FROM complexes WHERE id=ANY($1::uuid[]) ORDER BY id',[pids])).rows;
  assert.equal(rows.length,ids.length);assert.equal(parents.length,pids.length);assert.ok(rows.every(x=>x.status==='ACTIVE'&&x.total_reviews===0&&Number(x.average_rating)===0));
  const owners=(await i.query("SELECT u.id,p.operator_kind,u.is_active,u.is_deleted,h.approval_status,e.approval_status AS enterprise_approval FROM users u JOIN seed_host_provenance p ON p.user_id=u.id JOIN host_profiles h ON h.user_id=u.id LEFT JOIN enterprise_profiles e ON e.user_id=u.id WHERE p.identity_kind='FICTIONAL_TEST_OPERATOR'")).rows;
  assert.equal(owners.length,50);const ownerMap=new Map(owners.map(x=>[x.id,x])),parentMap=new Map(parents.map(x=>[x.id,x]));
  for(const l of rows){const user=ownerMap.get(l.host_id);assert.ok(user?.is_active&&!user.is_deleted&&user.approval_status==='APPROVED');assert.ok(!l.complex_id||parentMap.get(l.complex_id)?.host_id===l.host_id);assert.ok(l.description.includes('phục vụ kiểm thử'));}
  for(const p of parents){const user=ownerMap.get(p.host_id);assert.ok(user.operator_kind==='ENTERPRISE'&&user.enterprise_approval==='APPROVED');}
  out.checks.approvedVirtualHostsAndCorrectOwnership=true;
  assert.equal((await c.query('SELECT count(*)::integer AS n FROM reviews WHERE listing_id=ANY($1::uuid[])',[ids])).rows[0].n,0);out.checks.noInventedReviews=true;
  assert.equal((await c.query('SELECT count(*)::integer AS n FROM real_catalog_source_provenance WHERE batch_id=$1',[plan.batchId])).rows[0].n,plan.sources.length);out.checks.allImportedRecordsHaveSources=true;
  out.catalog={listings:rows.length,complexes:parents.length,STAY:rows.filter(x=>x.category==='STAY').length,EXP:rows.filter(x=>x.category==='EXP').length,SVC:rows.filter(x=>x.category==='SVC').length};
  const configs=(await b.query('SELECT count(*)::integer AS n FROM inventory_configs WHERE listing_id=ANY($1::uuid[]) AND is_active',[ids])).rows[0].n;
  const calendars=(await b.query('SELECT count(*)::integer AS n FROM inventory_calendars WHERE listing_id=ANY($1::uuid[])',[ids])).rows[0].n;
  assert.equal(configs,rows.length);assert.equal(calendars,out.catalog.STAY*91+(out.catalog.EXP+out.catalog.SVC)*182);out.inventory={configs,calendars,days:91,start:plan.inventoryStart,simulated:true};
  const manifest=require('../cloudinary-images.json'),verified=new Map(Object.values(manifest.assets).filter(x=>x.state==='verified').map(x=>[x.secureUrl,x]));
  const before=require('./active-image-baseline.json').records,priorUrls=new Set(before.flatMap(x=>[x.thumbnail_url,...(x.gallery_urls||[])]).filter(Boolean));const used=new Map();
  for(const row of [...rows,...parents])for(const u of new Set([row.thumbnail_url,...(row.gallery_urls||row.attributes?.galleryUrls||[])])){
   assert.ok(u.startsWith('https://res.cloudinary.com/'+manifest.cloudName+'/image/upload/'));assert.ok(verified.has(u));assert.ok(!priorUrls.has(u));const hash=verified.get(u).optimizedSha256;assert.ok(!used.has(hash)||used.get(hash)===row.id);used.set(hash,row.id);
  }
  out.uniquePhotographs=used.size;out.checks.newImagesOwnedVerifiedAndNotSharedWithExistingRecords=true;
  out.coverage=(await c.query("SELECT province,count(*) FILTER(WHERE category='STAY')::int AS stay,count(*) FILTER(WHERE category='EXP')::int AS exp,count(*) FILTER(WHERE category='SVC')::int AS svc FROM listings WHERE status='ACTIVE' GROUP BY province ORDER BY province")).rows;
  assert.equal(out.coverage.length,34);assert.ok(out.coverage.every(x=>x.stay>0&&x.exp>0&&x.svc>0));out.activeTotals={listings:out.coverage.reduce((n,x)=>n+x.stay+x.exp+x.svc,0),complexes:(await c.query("SELECT count(*)::int AS n FROM complexes WHERE status='ACTIVE'")).rows[0].n};
 }finally{await Promise.all([c.end(),b.end(),i.end()]);}
 async function request(base,endpoint){const time=Date.now(),r=await fetch(base+endpoint,{signal:AbortSignal.timeout(20000)});const data=await r.json();out.api.push({base,endpoint,http:r.status,durationMs:Date.now()-time});assert.equal(r.status,200,endpoint);return data;}
 for(const base of ['http://127.0.0.1:5555','https://gostay.nonnet123.io.vn'])for(const category of ['STAY','EXP','SVC']){
  const sample=plan.listings.find(x=>x.category===category);if(!sample)continue;
  const detail=await request(base,'/api/v1/catalog/listings/'+sample.id);assert.equal(detail.data.id,sample.id);assert.equal(detail.data.thumbnailUrl,sample.thumbnailUrl);
  const available=await request(base,'/api/v1/public/inventory/listings/'+sample.id+'/availability?startDate='+plan.inventoryStart+'&endDate='+plan.inventoryStart);assert.ok(available.data.length>0);
  const search=await request(base,'/api/v1/search/listings?category='+category+'&limit=500');assert.ok(search.data.some(x=>idsInPlan(x.id,plan,category)),'Search does not return any new listing');
 }
 function idsInPlan(id,plan,category){return plan.listings.some(l=>l.id===id&&l.category===category);}
 out.status='passed';save(path.join(dir,'verification.json'),out);console.log(JSON.stringify({status:out.status,catalog:out.catalog,photographs:out.uniquePhotographs,activeTotals:out.activeTotals,apiChecks:out.api.length}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
