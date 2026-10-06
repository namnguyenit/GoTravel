// Reversible discovery retirement; existing records, orders and inventories stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../expansion/db'),sql=require('../balanced/sql'),{save}=require('./research');
const dir=__dirname,sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const payload=rows=>JSON.stringify(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[snake(k),v]))));
async function main(){
 if(!process.argv.includes('--apply'))throw Error('Use --apply to import the reviewed plan');
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json')));
 assert.equal(plan.sourceSha256,sha(fs.readFileSync(path.join(dir,'official-establishments.json'))));
 assert.equal(plan.attractionSha256,sha(fs.readFileSync(path.join(dir,'real-attractions.json'))));
 assert.equal(plan.stageSha256,sha(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))));
 assert.ok(plan.listings.length>400,'A substantial verified replacement is required before retiring old data');
 const c=await connect('CatalogandListing'),b=await connect('BookingandInventory'),i=await connect('Identity');
 const receiptPath=path.join(dir,'receipt.json');const receipt={batchId:plan.batchId,planSha256:sha(fs.readFileSync(path.join(dir,'plan.json'))),startedAt:new Date().toISOString(),status:'preparing'};
 try{
  const hostIds=[...new Set(plan.listings.map(x=>x.hostId))];const users=(await i.query("SELECT u.id,array_agg(ur.roles_name) AS roles FROM users u JOIN users_roles ur ON ur.user_id=u.id JOIN seed_host_provenance p ON p.user_id=u.id WHERE u.id=ANY($1::text[]) AND u.is_active AND NOT u.is_deleted AND p.identity_kind='FICTIONAL_TEST_OPERATOR' GROUP BY u.id",[hostIds])).rows;assert.equal(users.length,hostIds.length);assert.ok(users.every(x=>x.roles.includes('USER')&&(x.roles.includes('HOST')||x.roles.includes('ENTERPRISE'))));
  await c.query('BEGIN');await b.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[plan.batchId]);await b.query('SELECT pg_advisory_xact_lock(hashtext($1))',[plan.batchId]);
  await c.query("SET LOCAL lock_timeout='8s'");await b.query("SET LOCAL lock_timeout='8s'");
  await c.query("CREATE TABLE IF NOT EXISTS real_catalog_source_provenance(record_type text NOT NULL,record_id uuid NOT NULL,source_id text NOT NULL,batch_id text NOT NULL,source_url text NOT NULL,verified_at timestamptz,verification_kind text NOT NULL,commerce_kind text NOT NULL,facts jsonb NOT NULL,photographs jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(record_type,record_id),UNIQUE(record_type,source_id))");
  const backupDir=path.join(dir,'backups');fs.mkdirSync(backupDir,{recursive:true,mode:0o700});fs.chmodSync(backupDir,0o700);
  const backupFile=path.join(backupDir,'before-real-catalog.json');let before;
  if(fs.existsSync(backupFile))before=JSON.parse(fs.readFileSync(backupFile));else{
    before={at:new Date().toISOString(),listings:(await c.query('SELECT * FROM listings')).rows,complexes:(await c.query('SELECT * FROM complexes')).rows,landmarks:(await c.query('SELECT * FROM landmarks')).rows,reviews:(await c.query('SELECT * FROM reviews')).rows,sourceProvenance:(await c.query('SELECT * FROM seed_record_provenance')).rows};
    fs.writeFileSync(backupFile,JSON.stringify(before),{mode:0o600,flag:'wx'});
  }
  const syntheticIds=new Set(before.sourceProvenance.filter(x=>x.record_type==='listings'&&x.origin==='synthetic').map(x=>x.record_id));
  // Old generators used numbered titles and stock-photo pools. Review that naming grammar,
  // rather than treating every future database row as expendable.
  const legacyDescription=/^(?:Trải nghiệm được thiết kế cho du khách muốn hiểu sâu hơn|Không gian lưu trú phù hợp cho khách du lịch muốn khám phá|Dịch vụ tận nơi quanh khu vực)/;
  const retireListings=before.listings.filter(x=>syntheticIds.has(x.id)||(/\s\d{1,4}$/.test(x.title)&&(/ gần | tại | — /i.test(x.title)||legacyDescription.test(x.description||'')))).map(x=>x.id);
  const syntheticParents=new Set(before.sourceProvenance.filter(x=>x.record_type==='complexes'&&x.origin==='synthetic').map(x=>x.record_id));
  const retireComplexes=before.complexes.filter(x=>syntheticParents.has(x.id)||/ — (?:Cty|Công ty|Trung tâm|Chi nhánh|Cửa hàng)/.test(x.name)).map(x=>x.id);
  receipt.backupFile=backupFile;receipt.retirementCandidates={listings:retireListings.length,complexes:retireComplexes.length};
  for(const [table,rows]of [['complexes',plan.complexes],['listings',plan.listings]]){
    const ids=rows.map(x=>x.id);const existing=(await c.query(`SELECT id FROM ${table} WHERE id=ANY($1::uuid[])`,[ids])).rows;
    for(const x of existing)assert.ok((await c.query('SELECT 1 FROM real_catalog_source_provenance WHERE record_type=$1 AND record_id=$2 AND batch_id=$3',[table,x.id,plan.batchId])).rowCount,'Existing ID is not owned by this seed batch');
    await c.query(sql[table]+' ON CONFLICT(id) DO NOTHING',[payload(rows)]);
  }
  for(const s of plan.sources){await c.query("INSERT INTO real_catalog_source_provenance(record_type,record_id,source_id,batch_id,source_url,verified_at,verification_kind,commerce_kind,facts,photographs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) ON CONFLICT(record_type,record_id) DO NOTHING",[s.recordType,s.recordId,s.sourceId,plan.batchId,s.sourceUrl,s.verifiedAt,s.verificationKind,s.commerceKind,JSON.stringify(s.facts),JSON.stringify(s.photos)]);await c.query("INSERT INTO seed_record_provenance(record_type,record_id,batch_id,origin,presentation_revision) VALUES($1,$2,$3,'real-public-facts-virtual-test-operator',1) ON CONFLICT(record_type,record_id) DO NOTHING",[s.recordType,s.recordId,plan.batchId]);}
  const ids=plan.listings.map(x=>x.id);const oldConfig=(await b.query('SELECT listing_id FROM inventory_configs WHERE listing_id=ANY($1::uuid[])',[ids])).rows;
  for(const x of oldConfig)assert.ok((await c.query("SELECT 1 FROM real_catalog_source_provenance WHERE record_type='listings' AND record_id=$1 AND batch_id=$2",[x.listing_id,plan.batchId])).rowCount);
  await b.query(sql.inventory_configs+' ON CONFLICT(listing_id) DO NOTHING',[payload(plan.inventory)]);
  await b.query("INSERT INTO inventory_calendars(id,listing_id,date,time_slot,available_quantity,status,version,created_at,updated_at) SELECT gen_random_uuid(),c.listing_id,$2::date+d.n,s.slot,s.quantity,'AVAILABLE',0,now(),now() FROM inventory_configs c CROSS JOIN generate_series(0,90) AS d(n) CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN c.category='STAY' THEN jsonb_build_array(jsonb_build_object('slot','ALL_DAY','quantity',c.schedule_config->'defaultQuantity')) ELSE c.schedule_config->'timeSlots' END) AS s(slot text,quantity integer) WHERE c.listing_id=ANY($1::uuid[]) AND c.is_active=true ON CONFLICT(listing_id,date,time_slot) DO NOTHING",[ids,plan.inventoryStart]);
  // Keep all legacy inventory configs/calendars/locks and all order snapshots untouched.
  receipt.hiddenListings=(await c.query("UPDATE listings SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'",[retireListings])).rowCount;
  receipt.hiddenComplexes=(await c.query("UPDATE complexes SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'",[retireComplexes])).rowCount;
  const oldPlaces=JSON.parse(fs.readFileSync(path.join(dir,'../expansion/destinations.json'))).destinations;
  const illustratedNames=oldPlaces.filter(x=>/(?:\bmap\b|\blogo\b|\bflag\b|\bdiagram\b|coat of arms|locator|bản đồ)/i.test(x.image.fileTitle.replaceAll('_',' '))).map(x=>x.title);
  const badLandmarks=(before.landmarks||[]).filter(x=>illustratedNames.includes(x.name)).map(x=>x.id);
  receipt.hiddenIllustrationLandmarks=(await c.query("UPDATE landmarks SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'",[badLandmarks])).rowCount;
  save(receiptPath,receipt);await b.query('COMMIT');receipt.status='inventory_committed_catalog_pending';save(receiptPath,receipt);
  await c.query('COMMIT');receipt.status='committed';receipt.completedAt=new Date().toISOString();receipt.imported={listings:plan.listings.length,complexes:plan.complexes.length};save(receiptPath,receipt);
  console.log(JSON.stringify({status:receipt.status,imported:receipt.imported,hiddenListings:receipt.hiddenListings,hiddenComplexes:receipt.hiddenComplexes,backupFile,legacyInventories:'unchanged'}));
 }catch(e){await c.query('ROLLBACK').catch(()=>{});await b.query('ROLLBACK').catch(()=>{});receipt.error=e.message;save(receiptPath,receipt);throw e;}finally{await c.end();await b.end();await i.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
