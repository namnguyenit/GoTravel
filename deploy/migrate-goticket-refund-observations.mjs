import {connectAll} from './seeds/goticket/runner/src/core.mjs';
import {readFileSync} from 'node:fs';
const db=await connectAll();
try{
 await db.pay.query('BEGIN');
 try{await db.pay.query("SET LOCAL lock_timeout='5s'");await db.pay.query(readFileSync(new URL('./sql/goticket-refund-observations.sql',import.meta.url),'utf8'));await db.pay.query('COMMIT');}
 catch(error){await db.pay.query('ROLLBACK');throw error;}
 console.log('Refund polling schedule and immutable observations ready.');
}finally{await Promise.all(Object.values(db).map(d=>d.end()));}
