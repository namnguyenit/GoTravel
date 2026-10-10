const assert=require('node:assert/strict');
const {connect}=require('../expansion/db'),sql=require('../balanced/sql');
const {fs,path,dir,save,hash}=require('./common');
const {batchId}=require('./build-plan');
const snake=k=>k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const payload=rows=>JSON.stringify(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[snake(k),v]))));
async function snapshot(c,b,o,plan){
 const out={};
 for(const [name,db,tables] of [['Catalog',c,['listings','complexes','landmarks','reviews','seed_record_provenance','real_catalog_source_provenance']],['Inventory',b,['inventory_configs','inventory_calendars','inventory_locks']],['Orders',o,['orders','order_items']]])for(const table of tables){
  let filter='',values=[];
  if(['listings','complexes'].includes(table)){filter='WHERE NOT(id=ANY($1::uuid[]))';values=[[...plan[table].map(x=>x.id),...plan.patches[table].map(x=>x.id)]];}
  else if(['inventory_configs','inventory_calendars'].includes(table)){filter='WHERE NOT(listing_id=ANY($1::uuid[]))';values=[plan.listings.map(x=>x.id)];}
  else if(table.endsWith('provenance')){filter='WHERE batch_id<>$1';values=[plan.batchId];}
  out[name+'.'+table]=(await db.query(`SELECT count(*)::int count,COALESCE(bit_xor(hashtextextended(to_jsonb(r)::text,0)),0)::text checksum FROM ${table} r ${filter}`,values)).rows[0];
 }
 for(const table of ['listings','complexes'])out['Curated.'+table]=(await c.query(`SELECT count(*)::int count,COALESCE(bit_xor(hashtextextended((to_jsonb(r)-'status'-'updated_at')::text,0)),0)::text checksum FROM ${table} r WHERE id=ANY($1::uuid[])`,[plan.patches[table].map(x=>x.id)])).rows[0];
 return out;
}
async function main(){
 assert.ok(process.argv.includes('--apply'),'Use --apply only after reviewing plan.json');
 const planRaw=fs.readFileSync(path.join(dir,'plan.json')),plan=JSON.parse(planRaw),planHash=hash(planRaw);
 for(const [key,file] of [['sourceSha256','official-catalog.json'],['stageSha256','verified-image-allocations.json'],['reviewSha256','photo-review.json']])assert.equal(plan[key],hash(fs.readFileSync(path.join(dir,file))),file+' changed');
 assert.equal(plan.batchId,batchId);assert.ok(plan.listings.length>=100&&plan.listings.length<300);assert.equal(plan.inventoryDays,91);
 const receiptFile=path.join(dir,'receipt.json'),prior=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):null;
 if(prior)assert.equal(prior.planSha256,planHash,'Plan changed after journal creation');
 const receipt=prior||{batchId,planSha256:planHash,startedAt:new Date().toISOString(),status:'preparing'};
 const c=await connect('CatalogandListing'),b=await connect('BookingandInventory'),i=await connect('Identity'),o=await connect('CartandOrder');
 try{
  if(receipt.status==='committed'){
   assert.equal((await c.query('SELECT count(*)::int n FROM real_catalog_source_provenance WHERE batch_id=$1',[batchId])).rows[0].n,plan.sources.length);
   console.log(JSON.stringify({status:'already_completed',listings:plan.listings.length}));return;
  }
  // Recover the narrow crash window after Catalog COMMIT but before the
  // completion receipt is written. Verify owned rows and curation status.
  const owned=(await c.query('SELECT count(*)::int n FROM real_catalog_source_provenance WHERE batch_id=$1',[batchId])).rows[0].n;
  if(prior&&owned===plan.sources.length){
   assert.equal((await b.query('SELECT count(*)::int n FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[plan.listings.map(x=>x.id)])).rows[0].n,plan.inventory.length);
   for(const table of ['listings','complexes'])assert.equal((await c.query(`SELECT count(*)::int n FROM ${table} WHERE id=ANY($1::uuid[]) AND status='HIDDEN'`,[plan.patches[table].map(x=>x.id)])).rows[0].n,plan.patches[table].length);
   assert.ok(receipt.protectedUnchanged,'Missing pre-commit protected-data verification');
   receipt.status='committed';receipt.completedAt=new Date().toISOString();receipt.recoveredAfterCatalogCommit=true;receipt.imported={listings:plan.listings.length,complexes:plan.complexes.length};receipt.hidden={listings:plan.patches.listings.length,complexes:plan.patches.complexes.length};save(receiptFile,receipt);console.log(JSON.stringify({status:'recovered_completed',imported:receipt.imported}));return;
  }
  const hostIds=[...new Set(plan.listings.map(x=>x.hostId))],users=(await i.query("SELECT u.id,array_agg(r.roles_name) roles FROM users u JOIN users_roles r ON r.user_id=u.id JOIN seed_host_provenance p ON p.user_id=u.id WHERE u.id=ANY($1::text[]) AND u.is_active AND NOT u.is_deleted AND p.identity_kind='FICTIONAL_TEST_OPERATOR' GROUP BY u.id",[hostIds])).rows;
  assert.equal(users.length,hostIds.length);assert.ok(users.every(x=>x.roles.includes('USER')&&(x.roles.includes('HOST')||x.roles.includes('ENTERPRISE'))));
  const enterprise=new Set(users.filter(x=>x.roles.includes('ENTERPRISE')).map(x=>x.id));for(const x of plan.complexes)assert.ok(enterprise.has(x.hostId));
  const parents=new Map(plan.complexes.map(x=>[x.id,x]));for(const l of plan.listings)if(l.complexId)assert.equal(l.hostId,parents.get(l.complexId).hostId);
  for(const db of [c,b,o]){await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='8s'");}
  // Block new order-item inserts during the brief curation transaction. Orders
  // and existing calendars are never edited by this batch.
  await o.query('LOCK TABLE order_items IN SHARE MODE');
  for(const db of [c,b])await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[batchId]);
  const ids=plan.listings.map(x=>x.id),parentIds=plan.complexes.map(x=>x.id),hideIds=plan.patches.listings.map(x=>x.id);
  const referenced=(await o.query('SELECT DISTINCT listing_id FROM order_items WHERE listing_id=ANY($1::uuid[])',[hideIds])).rows;
  assert.equal(referenced.length,0,'A new order references a planned hidden listing; rebuild curation plan');
  const locked=(await b.query("SELECT c.listing_id FROM inventory_locks l JOIN inventory_calendars c ON c.id=l.inventory_calendar_id WHERE c.listing_id=ANY($1::uuid[]) AND l.expires_at>now() AND l.lock_status='LOCKED'",[hideIds])).rows;
  assert.equal(locked.length,0,'A planned hidden listing has an active inventory lock');
  for(const table of ['listings','complexes']){
   const existing=(await c.query(`SELECT r.*,md5(to_jsonb(r)::text) fingerprint FROM ${table} r WHERE id=ANY($1::uuid[]) FOR UPDATE`,[plan.patches[table].map(x=>x.id)])).rows;
   assert.equal(existing.length,plan.patches[table].length);
   for(const patch of plan.patches[table]){const row=existing.find(x=>x.id===patch.id);assert.equal(row.fingerprint,patch.fingerprint,'Curation target changed: '+patch.id);assert.equal(row.status,'ACTIVE');}
   for(const x of (await c.query(`SELECT id FROM ${table} WHERE id=ANY($1::uuid[])`,[plan[table].map(x=>x.id)])).rows)assert.ok((await c.query('SELECT 1 FROM real_catalog_source_provenance WHERE record_type=$1 AND record_id=$2 AND batch_id=$3',[table,x.id,batchId])).rowCount,'ID collision');
  }
  for(const x of (await b.query('SELECT listing_id FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[ids])).rows){const owned=(await c.query("SELECT 1 FROM real_catalog_source_provenance WHERE record_type='listings' AND record_id=$1 AND batch_id=$2",[x.listing_id,batchId])).rowCount;assert.ok(owned||receipt.status==='inventory_committed_catalog_pending','Inventory collision outside recovery journal');}
  const backupDir=path.join(dir,'backups');fs.mkdirSync(backupDir,{recursive:true,mode:0o700});fs.chmodSync(backupDir,0o700);const backupFile=path.join(backupDir,'before.json');
  if(!fs.existsSync(backupFile)){
   const before={batchId,planSha256:planHash,capturedAt:new Date().toISOString(),protected:await snapshot(c,b,o,plan),catalog:{}};
   for(const table of ['listings','complexes','landmarks','reviews','seed_record_provenance','real_catalog_source_provenance'])before.catalog[table]=(await c.query(`SELECT * FROM ${table}`)).rows;
   fs.writeFileSync(backupFile,JSON.stringify(before),{mode:0o600,flag:'wx'});
  }
  receipt.backupFile=backupFile;save(receiptFile,receipt);
  for(const table of ['complexes','listings'])await c.query(sql[table]+' ON CONFLICT(id) DO NOTHING',[payload(plan[table])]);
  for(const s of plan.sources){
   await c.query('INSERT INTO real_catalog_source_provenance(record_type,record_id,source_id,batch_id,source_url,verified_at,verification_kind,commerce_kind,facts,photographs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) ON CONFLICT(record_type,record_id) DO NOTHING',[s.recordType,s.recordId,s.sourceId,batchId,s.sourceUrl,s.verifiedAt,s.verificationKind,s.commerceKind,JSON.stringify(s.facts),JSON.stringify(s.photos)]);
   await c.query("INSERT INTO seed_record_provenance(record_type,record_id,batch_id,origin,presentation_revision) VALUES($1,$2,$3,'real-public-facts-virtual-test-operator',1) ON CONFLICT(record_type,record_id) DO NOTHING",[s.recordType,s.recordId,batchId]);
  }
  for(const table of ['listings','complexes']){
   const result=await c.query(`UPDATE ${table} SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'`,[plan.patches[table].map(x=>x.id)]);assert.equal(result.rowCount,plan.patches[table].length);
  }
  await b.query(sql.inventory_configs+' ON CONFLICT(listing_id) DO NOTHING',[payload(plan.inventory)]);
  await b.query("INSERT INTO inventory_calendars(id,listing_id,date,time_slot,available_quantity,status,version,created_at,updated_at) SELECT gen_random_uuid(),c.listing_id,$2::date+d.n,s.slot,s.quantity,'AVAILABLE',0,now(),now() FROM inventory_configs c CROSS JOIN generate_series(0,90) d(n) CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN c.category='STAY' THEN jsonb_build_array(jsonb_build_object('slot','ALL_DAY','quantity',c.schedule_config->'defaultQuantity')) ELSE c.schedule_config->'timeSlots' END) s(slot text,quantity integer) WHERE c.listing_id=ANY($1::uuid[]) AND c.is_active ON CONFLICT(listing_id,date,time_slot) DO NOTHING",[ids,plan.inventoryStart]);
  assert.equal((await c.query('SELECT count(*)::int n FROM listings WHERE id=ANY($1::uuid[]) AND status=$2',[ids,'ACTIVE'])).rows[0].n,ids.length);
  assert.equal((await b.query('SELECT count(*)::int n FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[ids])).rows[0].n,ids.length);
  const before=JSON.parse(fs.readFileSync(backupFile)),after=await snapshot(c,b,o,plan);
  receipt.protectedBefore=before.protected;receipt.protectedAfter=after;receipt.protectedUnchanged=JSON.stringify(before.protected)===JSON.stringify(after);assert.ok(receipt.protectedUnchanged,'Protected data changed; review concurrent writes before retrying');
  await b.query('COMMIT');receipt.status='inventory_committed_catalog_pending';save(receiptFile,receipt);
  await c.query('COMMIT');await o.query('COMMIT');receipt.status='committed';receipt.completedAt=new Date().toISOString();receipt.imported={listings:ids.length,complexes:parentIds.length};receipt.hidden={listings:hideIds.length,complexes:plan.patches.complexes.length};save(receiptFile,receipt);
  console.log(JSON.stringify({status:receipt.status,imported:receipt.imported,hidden:receipt.hidden,protectedUnchanged:receipt.protectedUnchanged}));
 }catch(e){for(const db of [c,b,o])await db.query('ROLLBACK').catch(()=>{});receipt.error=e.message;save(receiptFile,receipt);throw e;}
 finally{await Promise.all([c.end(),b.end(),i.end(),o.end()]);}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={snapshot};
