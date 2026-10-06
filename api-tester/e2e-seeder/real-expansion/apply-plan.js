// Additive batch: two database transactions, immutable plan and recovery journal.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {connect}=require('../expansion/db'),sql=require('../balanced/sql');const {dir,sha,save}=require('./helpers');
const snake=k=>k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const payload=rows=>JSON.stringify(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[snake(k),v]))));
async function protectedSnapshot(c,b,o,plan){
 const out={};
 const tables=[['CatalogandListing',c,['listings','complexes','landmarks','reviews','seed_record_provenance','real_catalog_source_provenance']],['BookingandInventory',b,['inventory_configs','inventory_calendars','inventory_locks']],['CartandOrder',o,['orders','order_items']]];
 for(const [service,client,names]of tables)for(const table of names){
  let filter='',values=[];if(['listings','complexes'].includes(table)){filter='WHERE NOT(id=ANY($1::uuid[]))';values=[table==='listings'?plan.listings.map(x=>x.id):plan.complexes.map(x=>x.id)];}
  else if(['inventory_configs','inventory_calendars'].includes(table)){filter='WHERE NOT(listing_id=ANY($1::uuid[]))';values=[plan.listings.map(x=>x.id)];}
  else if(['seed_record_provenance','real_catalog_source_provenance'].includes(table)){filter='WHERE batch_id<>$1';values=[plan.batchId];}
  out[service+'.'+table]=(await client.query(`SELECT count(*)::integer AS count,COALESCE(bit_xor(hashtextextended(to_jsonb(r)::text,0)),0)::text AS checksum FROM ${table} r ${filter}`,values)).rows[0];
 }
 return out;
}
async function main(){
 if(!process.argv.includes('--apply'))throw Error('Use --apply after the staged image review and immutable plan');
 const planPath=path.join(dir,'plan.json'),plan=JSON.parse(fs.readFileSync(planPath)),planHash=sha(fs.readFileSync(planPath));
 for(const [key,file]of [['sourceSha256','official-establishments.json'],['attractionSha256','real-attractions.json'],['stageSha256','verified-image-allocations.json']])assert.equal(plan[key],sha(fs.readFileSync(path.join(dir,file))));
 assert.equal(plan.batchId,'gotravel-real-expansion-2026-10-05-v2');assert.ok(plan.listings.length>0&&plan.listings.length<300);
 const receiptPath=path.join(dir,'receipt.json'),prior=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath)):null;
 if(prior)assert.equal(prior.planSha256,planHash,'Batch plan changed after journal creation');
 const c=await connect('CatalogandListing'),b=await connect('BookingandInventory'),i=await connect('Identity'),o=await connect('CartandOrder');
 const receipt=prior||{batchId:plan.batchId,planSha256:planHash,startedAt:new Date().toISOString(),status:'preparing'};
 try{
  if(prior?.status==='committed'){const count=(await c.query("SELECT count(*)::integer AS n FROM real_catalog_source_provenance WHERE batch_id=$1",[plan.batchId])).rows[0].n;assert.equal(count,plan.sources.length);console.log(JSON.stringify({status:'already_completed',listings:plan.listings.length}));return;}
  const hostIds=[...new Set(plan.listings.map(x=>x.hostId))];
  const users=(await i.query("SELECT u.id,array_agg(ur.roles_name) AS roles FROM users u JOIN users_roles ur ON ur.user_id=u.id JOIN seed_host_provenance p ON p.user_id=u.id WHERE u.id=ANY($1::text[]) AND u.is_active AND NOT u.is_deleted AND p.identity_kind='FICTIONAL_TEST_OPERATOR' GROUP BY u.id",[hostIds])).rows;
  assert.equal(users.length,hostIds.length);assert.ok(users.every(x=>x.roles.includes('USER')&&(x.roles.includes('HOST')||x.roles.includes('ENTERPRISE'))));
  const enterprise=new Set(users.filter(x=>x.roles.includes('ENTERPRISE')).map(x=>x.id));for(const x of plan.complexes)assert.ok(enterprise.has(x.hostId));
  await c.query('BEGIN');await b.query('BEGIN');for(const db of [c,b]){await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[plan.batchId]);await db.query("SET LOCAL lock_timeout='8s'");}
  const ids=plan.listings.map(x=>x.id),parentIds=plan.complexes.map(x=>x.id);
  for(const [table,recordIds]of [['listings',ids],['complexes',parentIds]])for(const x of (await c.query(`SELECT id FROM ${table} WHERE id=ANY($1::uuid[])`,[recordIds])).rows){assert.ok((await c.query('SELECT 1 FROM real_catalog_source_provenance WHERE record_type=$1 AND record_id=$2 AND batch_id=$3',[table,x.id,plan.batchId])).rowCount,'Existing ID is not owned by this batch');}
  const oldInventory=(await b.query('SELECT listing_id FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[ids])).rows;
  for(const x of oldInventory){const owned=(await c.query("SELECT 1 FROM real_catalog_source_provenance WHERE record_type='listings' AND record_id=$1 AND batch_id=$2",[x.listing_id,plan.batchId])).rowCount;assert.ok(owned||prior?.status==='inventory_committed_catalog_pending','Existing inventory is not owned by this batch/recovery journal');}
  const backupDir=path.join(dir,'backups');fs.mkdirSync(backupDir,{recursive:true,mode:0o700});fs.chmodSync(backupDir,0o700);
  const baselineFile=path.join(backupDir,'before-expansion.json');
  if(!fs.existsSync(baselineFile)){
   const before={capturedAt:new Date().toISOString(),batchId:plan.batchId,planSha256:planHash,protected:await protectedSnapshot(c,b,o,plan),catalog:{}};
   for(const table of ['listings','complexes','landmarks','reviews','seed_record_provenance','real_catalog_source_provenance'])before.catalog[table]=(await c.query(`SELECT * FROM ${table}`)).rows;
   fs.writeFileSync(baselineFile,JSON.stringify(before),{mode:0o600,flag:'wx'});
  }
  receipt.backupFile=baselineFile;save(receiptPath,receipt);
  for(const [table,rows]of [['complexes',plan.complexes],['listings',plan.listings]])await c.query(sql[table]+' ON CONFLICT(id) DO NOTHING',[payload(rows)]);
  for(const s of plan.sources){
   await c.query('INSERT INTO real_catalog_source_provenance(record_type,record_id,source_id,batch_id,source_url,verified_at,verification_kind,commerce_kind,facts,photographs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) ON CONFLICT(record_type,record_id) DO NOTHING',[s.recordType,s.recordId,s.sourceId,plan.batchId,s.sourceUrl,s.verifiedAt,s.verificationKind,s.commerceKind,JSON.stringify(s.facts),JSON.stringify(s.photos)]);
   await c.query("INSERT INTO seed_record_provenance(record_type,record_id,batch_id,origin,presentation_revision) VALUES($1,$2,$3,'real-public-facts-virtual-test-operator',1) ON CONFLICT(record_type,record_id) DO NOTHING",[s.recordType,s.recordId,plan.batchId]);
  }
  await b.query(sql.inventory_configs+' ON CONFLICT(listing_id) DO NOTHING',[payload(plan.inventory)]);
  await b.query("INSERT INTO inventory_calendars(id,listing_id,date,time_slot,available_quantity,status,version,created_at,updated_at) SELECT gen_random_uuid(),c.listing_id,$2::date+d.n,s.slot,s.quantity,'AVAILABLE',0,now(),now() FROM inventory_configs c CROSS JOIN generate_series(0,90) AS d(n) CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN c.category='STAY' THEN jsonb_build_array(jsonb_build_object('slot','ALL_DAY','quantity',c.schedule_config->'defaultQuantity')) ELSE c.schedule_config->'timeSlots' END) AS s(slot text,quantity integer) WHERE c.listing_id=ANY($1::uuid[]) AND c.is_active=true ON CONFLICT(listing_id,date,time_slot) DO NOTHING",[ids,plan.inventoryStart]);
  assert.equal((await c.query('SELECT count(*)::integer AS n FROM listings WHERE id=ANY($1::uuid[])',[ids])).rows[0].n,ids.length);
  assert.equal((await b.query('SELECT count(*)::integer AS n FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[ids])).rows[0].n,ids.length);
  await b.query('COMMIT');receipt.status='inventory_committed_catalog_pending';save(receiptPath,receipt);
  await c.query('COMMIT');receipt.status='committed';receipt.completedAt=new Date().toISOString();receipt.imported={listings:ids.length,complexes:parentIds.length};save(receiptPath,receipt);
  const baseline=JSON.parse(fs.readFileSync(baselineFile));const after=await protectedSnapshot(c,b,o,plan);receipt.protectedBefore=baseline.protected;receipt.protectedAfter=after;receipt.protectedUnchanged=JSON.stringify(after)===JSON.stringify(baseline.protected);save(receiptPath,receipt);
  assert.ok(receipt.protectedUnchanged,'Pre-existing data changed during import; inspect checksums and concurrent activity');
  console.log(JSON.stringify({status:receipt.status,imported:receipt.imported,protectedUnchanged:receipt.protectedUnchanged}));
 }catch(e){await c.query('ROLLBACK').catch(()=>{});await b.query('ROLLBACK').catch(()=>{});receipt.error=e.message;save(receiptPath,receipt);throw e;}
 finally{await Promise.all([c.end(),b.end(),i.end(),o.end()]);}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={protectedSnapshot};
