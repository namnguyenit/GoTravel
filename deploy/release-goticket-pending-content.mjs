// One-time, repeatable cleanup for GoTicket transport content after removal of manual review.
// Leaves GoTravel listings, HIDDEN/DELETED content and unapproved/inactive vendors alone.
import {connectAll, secrets, ROOT} from './seeds/goticket/runner/src/core.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const db=await connectAll();
try {
 const candidates=(await db.catalog.query("select id,host_id,transport_operator_id,transport_route_id,status,updated_at from listings where category='TRANSPORT' and status='PENDING' and transport_route_id is not null and transport_operator_id is not null")).rows;
 const eligible=[],skipped=[];
 const token=process.env.INTERNAL_SERVICE_TOKEN||secrets.INTERNAL_SERVICE_TOKEN;
 if(candidates.length&&!token)throw Error('Missing internal service authentication');
 for(const row of candidates){
  const response=await fetch('http://127.0.0.1:8080/api/users/internal/'+encodeURIComponent(row.host_id)+'/status',{headers:{'x-internal-service-token':token},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Identity unavailable; no pending content released');
  const account=(await response.json()).data;
  const route=(await db.car.query('select r.status,r.deleted_at,r.operator_id,o.user_id,o.status as operator_status from routes r join operators o on o.id=r.operator_id where r.id=$1',[row.transport_route_id])).rows[0];
  if(account?.isAllowed===true&&account.ticketVendorApprovalStatus==='APPROVED'&&route&&route.status==='ACTIVE'&&!route.deleted_at&&route.operator_status==='ACTIVE'&&route.operator_id===row.transport_operator_id&&route.user_id===row.host_id)eligible.push(row);
  else skipped.push(row.id);
 }
 const dir=resolve(ROOT,'.data/goticket-journey-audit/20261028-remove-content-review');mkdirSync(dir,{recursive:true,mode:0o700});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');writeFileSync(resolve(dir,`pending-before-${stamp}.json`),JSON.stringify({eligible,skipped},null,2),{mode:0o600});
 await db.catalog.query('BEGIN');let released=[];
 try {
  await db.catalog.query("SET LOCAL lock_timeout='5s'");
  if(eligible.length)released=(await db.catalog.query("update listings set status='ACTIVE',updated_at=now() where id=any($1::uuid[]) and category='TRANSPORT' and status='PENDING' returning id",[eligible.map(r=>r.id)])).rows;
  await db.catalog.query('COMMIT');
 }catch(error){await db.catalog.query('ROLLBACK');throw error;}
 writeFileSync(resolve(dir,`release-result-${stamp}.json`),JSON.stringify({released,skipped},null,2),{mode:0o600});
 console.log(JSON.stringify({pendingCandidates:candidates.length,released:released.length,skipped:skipped.length}));
}finally{await Promise.all(Object.values(db).map(client=>client.end()));}
